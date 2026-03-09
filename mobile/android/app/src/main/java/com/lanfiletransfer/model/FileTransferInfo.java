package com.lanfiletransfer.model;

public class FileTransferInfo {
    private String id;
    private String fileName;
    private long fileSize;
    private String sourceDevice;
    private String targetDevice;
    private long transferredBytes;
    private TransferStatus status;
    
    public enum TransferStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        FAILED,
        CANCELLED
    }
    
    public FileTransferInfo() {
        this.status = TransferStatus.PENDING;
        this.transferredBytes = 0;
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    
    public String getSourceDevice() { return sourceDevice; }
    public void setSourceDevice(String sourceDevice) { this.sourceDevice = sourceDevice; }
    
    public String getTargetDevice() { return targetDevice; }
    public void setTargetDevice(String targetDevice) { this.targetDevice = targetDevice; }
    
    public long getTransferredBytes() { return transferredBytes; }
    public void setTransferredBytes(long transferredBytes) { this.transferredBytes = transferredBytes; }
    
    public TransferStatus getStatus() { return status; }
    public void setStatus(TransferStatus status) { this.status = status; }
    
    public int getProgress() {
        if (fileSize == 0) return 0;
        return (int) ((transferredBytes * 100) / fileSize);
    }
}
