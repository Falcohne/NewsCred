package com.NewsCred.backend.service;

import java.util.List;

public class FetchResult {
    private final String content;
    private final String title;
    private final String sourceName;
    private final List<String> imageUrls;
    private boolean success;
    private String errorMessage;

    public FetchResult(String content, String title, String sourceName, List<String> imageUrls) {
        this.content = content;
        this.title = title;
        this.sourceName = sourceName;
        this.imageUrls = imageUrls;
        this.success = true;
    }

    private FetchResult(String errorMessage) {
        this.content = null;
        this.title = null;
        this.sourceName = null;
        this.imageUrls = null;
        this.success = false;
        this.errorMessage = errorMessage;
    }

    public static FetchResult error(String errorMessage) {
        return new FetchResult(errorMessage);
    }

    public String getContent() { return content; }
    public String getTitle() { return title; }
    public String getSourceName() { return sourceName; }
    public List<String> getImageUrls() { return imageUrls; }
    public boolean isSuccess() { return success; }
    public String getErrorMessage() { return errorMessage; }
}