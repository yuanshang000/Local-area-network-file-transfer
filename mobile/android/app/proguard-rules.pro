# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/lib/android/sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native

# Keep line numbers for easier stack traces
-keepattributes SourceFile,LineNumberTable

# Keep React Native native methods
-keepclassmembers class * { public <methods>; }
-keepclassmembers class * { native <methods>; }

# Keep interfaces
-keep,allowobfuscation interface * { *; }

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Remove React Native debugging
-assumenosideeffects class com.facebook.react.bridge.** {
    public static *** isDebug(...);
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer