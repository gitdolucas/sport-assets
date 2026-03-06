# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Nothing yet.

## [0.1.0] - 2025-03-05

### Changed

- **Breaking:** Renamed library component `SphereBackground` to `SportBallsBackground` and props type to `SportBallsBackgroundProps`.
- Renamed demo wrapper `SphereBackgroundClient` to `SportBallsDemo` (file `app/SportBallsDemo.tsx`).
- Public API now exports `SportBallsBackground`, `SportBallsBackgroundProps`, `SimulationParams`, `QualityOverride`, `ModelConfig`, and `getModelConfigs` from the package entry.

### Added

- LICENSE (MIT).
- CONTRIBUTING.md with setup, build, dev, and PR instructions.
- CHANGELOG.md.
- README badge and Contributing section.
- `files` in package.json for npm publish (dist + README only).
- Set `private: false` in package.json for open-source publishing.
