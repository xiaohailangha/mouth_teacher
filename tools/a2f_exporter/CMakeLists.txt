add_executable(mouth-teacher-a2f-exporter main.cpp)
target_link_libraries(mouth-teacher-a2f-exporter PRIVATE audio2x AudioFile::AudioFile)
set_target_properties(mouth-teacher-a2f-exporter PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY ${A2F_BINARY_DIR}/bin
)
