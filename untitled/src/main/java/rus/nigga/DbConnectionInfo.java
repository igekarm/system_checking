package com.example.dbclient;

import java.util.Objects;

public class DbConnectionInfo {
    private String name;
    private String type;
    private String url;
    private String username;
    private String password;

    // Обязательный пустой конструктор для сериализации/десериализации
    public DbConnectionInfo() {
    }

    public DbConnectionInfo(String name, String type, String url, String username, String password) {
        this.name = name;
        this.type = type;
        this.url = url;
        this.username = username;
        this.password = password;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    @Override
    public String toString() {
        return name + " (" + type + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DbConnectionInfo)) return false;
        DbConnectionInfo that = (DbConnectionInfo) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(type, that.type) &&
                Objects.equals(url, that.url) &&
                Objects.equals(username, that.username);
        // пароль не учитываем для equals
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, type, url, username);
    }
}
