package com.example.dbclient;

import java.time.LocalDateTime;
import java.util.Objects;

public class SavedQuery {
    private String name;
    private String sql;
    private LocalDateTime createdAt;

    public SavedQuery() {
        this.createdAt = LocalDateTime.now(); // или оставь пустым, если prefer null
    }

    public SavedQuery(String name, String sql) {
        this.name = name;
        this.sql = sql;
        this.createdAt = LocalDateTime.now();
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSql() { return sql; }
    public void setSql(String sql) { this.sql = sql; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return name + " (" + createdAt.toLocalDate() + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SavedQuery)) return false;
        SavedQuery that = (SavedQuery) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(sql, that.sql);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, sql);
    }
}
