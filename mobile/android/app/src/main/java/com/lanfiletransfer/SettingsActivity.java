package com.lanfiletransfer;

import android.os.Bundle;
import android.os.Environment;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.File;

public class SettingsActivity extends AppCompatActivity {

    private TextView downloadPathText;
    private Button browseButton;
    private Button resetButton;
    
    private String downloadPath;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        initViews();
        loadSettings();
    }

    private void initViews() {
        downloadPathText = findViewById(R.id.downloadPathText);
        browseButton = findViewById(R.id.browseButton);
        resetButton = findViewById(R.id.resetButton);

        browseButton.setOnClickListener(v -> {
            // TODO: 实现文件夹选择器
            Toast.makeText(this, "文件夹选择功能开发中...\n请手动修改路径", Toast.LENGTH_SHORT).show();
        });

        resetButton.setOnClickListener(v -> resetSettings());
    }

    private void loadSettings() {
        android.content.SharedPreferences prefs = 
            getSharedPreferences("Settings", MODE_PRIVATE);
        
        downloadPath = prefs.getString("download_path", 
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath());
        
        downloadPathText.setText(downloadPath);
    }

    private void resetSettings() {
        downloadPath = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS).getAbsolutePath();
        
        downloadPathText.setText(downloadPath);
        
        android.content.SharedPreferences prefs = 
            getSharedPreferences("Settings", MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        editor.putString("download_path", downloadPath);
        editor.apply();
        
        Toast.makeText(this, "已恢复默认设置", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onPause() {
        super.onPause();
        saveSettings();
    }

    private void saveSettings() {
        android.content.SharedPreferences prefs = 
            getSharedPreferences("Settings", MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        editor.putString("download_path", downloadPath);
        editor.apply();
    }
}
