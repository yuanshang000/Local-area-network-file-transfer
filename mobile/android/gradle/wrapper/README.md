# Gradle Wrapper

This directory contains the Gradle wrapper files.

The `gradle-wrapper.jar` file will be automatically downloaded when you run `gradlew` for the first time.

To initialize the wrapper locally, run:
```bash
cd mobile/android
gradle wrapper --gradle-version 8.0
```

For GitHub Actions, the wrapper jar will be downloaded automatically during the build process.