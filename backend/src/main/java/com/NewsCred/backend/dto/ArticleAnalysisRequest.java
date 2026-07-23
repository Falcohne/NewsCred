package com.NewsCred.backend.dto;

import javax.validation.constraints.Pattern;

public class ArticleAnalysisRequest {

    /**
     * DEPRECATED: kept only so old clients that still send userId don't
     * break. The server IGNORES this field - the acting user is always
     * derived from the JWT (see ArticleController).
     */
    private String userId;

    /**
     * Optional. Empty string is allowed (the app sends url:"" when the
     * user pastes text instead). When non-empty, it must be a valid
     * http(s) URL.
     */
    @Pattern(
        regexp = "^$|^(https?)://[^\\s/$.?#].[^\\s]*$",
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
