[1mdiff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml[m
[1mindex 9944978..789d3a6 100644[m
[1m--- a/android/app/src/main/AndroidManifest.xml[m
[1m+++ b/android/app/src/main/AndroidManifest.xml[m
[36m@@ -1,6 +1,5 @@[m
 <?xml version="1.0" encoding="utf-8"?>[m
 <manifest xmlns:android="http://schemas.android.com/apk/res/android">[m
[31m-[m
     <application[m
         android:allowBackup="true"[m
         android:icon="@mipmap/ic_launcher"[m
[36m@@ -8,7 +7,6 @@[m
         android:roundIcon="@mipmap/ic_launcher_round"[m
         android:supportsRtl="true"[m
         android:theme="@style/AppTheme">[m
[31m-[m
         <activity[m
             android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"[m
             android:name=".MainActivity"[m
[36m@@ -16,14 +14,11 @@[m
             android:theme="@style/AppTheme.NoActionBarLaunch"[m
             android:launchMode="singleTask"[m
             android:exported="true">[m
[31m-[m
             <intent-filter>[m
                 <action android:name="android.intent.action.MAIN" />[m
                 <category android:name="android.intent.category.LAUNCHER" />[m
             </intent-filter>[m
[31m-[m
         </activity>[m
[31m-[m
         <provider[m
             android:name="androidx.core.content.FileProvider"[m
             android:authorities="${applicationId}.fileprovider"[m
[36m@@ -33,15 +28,13 @@[m
                 android:name="android.support.FILE_PROVIDER_PATHS"[m
                 android:resource="@xml/file_paths"></meta-data>[m
         </provider>[m
[31m-[m
         <!-- Канал по умолчанию для push-уведомлений (создаётся в MainActivity) —[m
              подстраховка на случай, если сообщение придёт без явного channel_id. -->[m
         <meta-data[m
             android:name="com.google.firebase.messaging.default_notification_channel_id"[m
             android:value="chat_messages" />[m
     </application>[m
[31m-[m
     <!-- Permissions -->[m
[31m-[m
     <uses-permission android:name="android.permission.INTERNET" />[m
[31m-</manifest>[m
[32m+[m[32m    <uses-permission android:name="android.permission.CAMERA" />[m
[32m+[m[32m</manifest>[m
\ No newline at end of file[m
