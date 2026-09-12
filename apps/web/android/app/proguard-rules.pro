# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Capacitor core bridge and plugin interfaces
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * implements com.getcapacitor.Plugin {
    public <methods>;
}

# Preserve WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugin compatibility
-keep class org.apache.cordova.** { *; }

# Preserve line numbers for crash reporting and stack traces
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Prevent shrinking on assets and resource reflections
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

