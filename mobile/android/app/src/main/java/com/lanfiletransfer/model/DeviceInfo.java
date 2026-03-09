package com.lanfiletransfer.model;

public class DeviceInfo {
    private String id;
    private String name;
    private String type;
    private String ip;
    
    public DeviceInfo() {}
    
    public DeviceInfo(String id, String name, String type, String ip) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.ip = ip;
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
}
