#include "audio2face/audio2face.h"
#include "audio2x/executor.h"
#include "AudioFile.h"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <iostream>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
struct Destroyer {
  template <typename T> void operator()(T* value) const { if (value) value->Destroy(); }
};
template <typename T> using Owned = std::unique_ptr<T, Destroyer>;

void Check(std::error_code error, const char* operation) {
  if (error) throw std::runtime_error(std::string(operation) + ": " + error.message());
}

struct Frame {
  nva2f::IBlendshapeExecutor::timestamp_t stamp{};
  std::vector<float> weights;
};

struct Collector {
  std::mutex mutex;
  std::vector<Frame> frames;
  std::error_code error;
};

void Collect(void* context, const nva2f::IBlendshapeExecutor::HostResults& result,
             std::error_code error) {
  auto& collector = *static_cast<Collector*>(context);
  std::lock_guard<std::mutex> lock(collector.mutex);
  if (error) { collector.error = error; return; }
  collector.frames.push_back({result.timeStampCurrentFrame,
                              {result.weights.Data(), result.weights.Data() + result.weights.Size()}});
}

std::vector<std::string> Names(const nva2f::BlendshapeSolverDataView& data) {
  if (!data.poseNames || !data.poseNamesSize) throw std::runtime_error("No blendshape names");
  std::vector<std::string> names;
  for (std::size_t i = 0; i < data.poseNamesSize; ++i) {
    const std::string name = data.poseNames[i] ? data.poseNames[i] : "";
    if (name.empty() || name.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_") != std::string::npos)
      throw std::runtime_error("Unexpected blendshape name");
    names.push_back(name);
  }
  return names;
}

void Export(const char* audioPath, const char* modelPath, const char* outputPath) {
  AudioFile<float> audio;
  if (!audio.load(audioPath) || audio.getSampleRate() != 16000 || audio.getNumChannels() != 1 || audio.samples[0].empty())
    throw std::runtime_error("Expected 16 kHz mono PCM WAV");

  nva2f::IDiffusionModel::IGeometryModelInfo* rawModel = nullptr;
  nva2f::IDiffusionModel::IBlendshapeSolveModelInfo* rawSolve = nullptr;
  Owned<nva2f::IBlendshapeExecutorBundle> bundle(nva2f::ReadDiffusionBlendshapeSolveExecutorBundle(
      1, modelPath, nva2f::IGeometryExecutor::ExecutionOption::SkinTongue,
      false, 0, true, &rawModel, &rawSolve));
  Owned<nva2f::IDiffusionModel::IGeometryModelInfo> model(rawModel);
  Owned<nva2f::IDiffusionModel::IBlendshapeSolveModelInfo> solve(rawSolve);
  if (!bundle || !model || !solve) throw std::runtime_error("Unable to open Audio2Face v3 model or blendshape solver");
  const auto params = solve->GetExecutorCreationParameters(nva2f::IGeometryExecutor::ExecutionOption::SkinTongue, 0);
  if (!params.initializationSkinParams || !params.initializationTongueParams)
    throw std::runtime_error("Model must contain both skin and tongue blendshape solvers");
  auto names = Names(params.initializationSkinParams->data);
  auto tongueNames = Names(params.initializationTongueParams->data);
  auto& executor = bundle->GetExecutor();
  if (executor.GetResultType() != nva2f::IBlendshapeExecutor::ResultsType::HOST ||
      executor.GetWeightCount() != names.size() + tongueNames.size())
    throw std::runtime_error("Unexpected blendshape result layout");

  Collector collector;
  Check(executor.SetResultsCallback(Collect, &collector), "SetResultsCallback");
  auto& emotions = bundle->GetEmotionAccumulator(0);
  std::vector<float> neutral(emotions.GetEmotionSize(), 0.0f);
  Check(emotions.Accumulate(0, nva2x::HostTensorFloatConstView{neutral.data(), neutral.size()},
                            bundle->GetCudaStream().Data()), "Accumulate emotion");
  Check(emotions.Close(), "Close emotion");
  auto& accumulator = bundle->GetAudioAccumulator(0);
  const auto& samples = audio.samples[0];
  Check(accumulator.Accumulate(nva2x::HostTensorFloatConstView{samples.data(), samples.size()},
                               bundle->GetCudaStream().Data()), "Accumulate audio");
  Check(accumulator.Close(), "Close audio");
  std::size_t calls = 0;
  while (nva2x::GetNbReadyTracks(executor) > 0) {
    if (++calls > 10000) throw std::runtime_error("Executor did not finish");
    Check(executor.Execute(nullptr), "Execute");
  }
  Check(executor.Wait(0), "Wait");
  if (collector.error) Check(collector.error, "Result callback");
  std::sort(collector.frames.begin(), collector.frames.end(),
            [](const Frame& a, const Frame& b) { return a.stamp < b.stamp; });
  if (collector.frames.empty()) throw std::runtime_error("Audio2Face produced no frames");

  std::ofstream out(outputPath, std::ios::binary);
  if (!out) throw std::runtime_error("Unable to create output JSON");
  out << "{\"schema\":2,\"source\":\"nvidia-audio2face-3d-v3.0\",\"fps\":60,\"channels\":[";
  for (std::size_t i = 0; i < names.size(); ++i) out << (i ? ",\"" : "\"") << names[i] << '"';
  out << "],\"tongueChannels\":[";
  for (std::size_t i = 0; i < tongueNames.size(); ++i) out << (i ? ",\"" : "\"") << tongueNames[i] << '"';
  out << "],\"frames\":[";
  for (std::size_t i = 0; i < collector.frames.size(); ++i) {
    const auto& frame = collector.frames[i];
    if (frame.weights.size() != names.size() + tongueNames.size()) throw std::runtime_error("Frame weight count changed");
    out << (i ? ",{" : "{") << "\"time\":" << (static_cast<double>(i) / 60.0) << ",\"values\":[";
    for (std::size_t j = 0; j < names.size(); ++j) {
      const float value = frame.weights[j];
      if (!std::isfinite(value)) throw std::runtime_error("Non-finite blendshape weight");
      out << (j ? "," : "") << value;
    }
    out << "],\"tongueValues\":[";
    for (std::size_t j = 0; j < tongueNames.size(); ++j) {
      const float value = frame.weights[names.size() + j];
      if (!std::isfinite(value)) throw std::runtime_error("Non-finite tongue weight");
      out << (j ? "," : "") << value;
    }
    out << "]}";
  }
  out << "]}\n";
  if (!out) throw std::runtime_error("Unable to write output JSON");
  std::cerr << "Exported " << collector.frames.size() << " frames, " << names.size()
            << " face and " << tongueNames.size() << " tongue channels\n";
}
}  // namespace

int main(int argc, char** argv) {
  if (argc != 4) { std::cerr << "usage: mouth-teacher-a2f-exporter INPUT_16K.wav MODEL.json OUTPUT.json\n"; return 2; }
  try { Export(argv[1], argv[2], argv[3]); return 0; }
  catch (const std::exception& error) { std::cerr << "Audio2Face export failed: " << error.what() << '\n'; return 1; }
}
