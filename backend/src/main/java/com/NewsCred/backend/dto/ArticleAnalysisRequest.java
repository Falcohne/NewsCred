package com.NewsCred.backend.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;

public class ArticleAnalysisRequest {
    
    @NotBlank(message = "User ID is required")
    private String userId;
    
    @Pattern(
        regexp = "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$",
        message = "Invalid URL format"
    )
    private String url;
    
    private String content;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}