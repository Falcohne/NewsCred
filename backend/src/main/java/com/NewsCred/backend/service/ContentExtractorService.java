package com.NewsCred.backend.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

@Service
public class ContentExtractorService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final int TIMEOUT = 15000;
    private static final int MAX_IMAGES = 10;

    public FetchResult fetchContent(String url) throws Exception {
        validateUrlExists(url);
        
        Document doc = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(TIMEOUT)
                .followRedirects(true)
                .get();

        String content = extractContent(doc);
        if (content.length() < 50) {
            throw new Exception("No meaningful content found at this URL");
        }

        String title = extractTitle(doc);
        String sourceName = extractDomain(url);
        List<String> imageUrls = extractImages(doc, url);

        return new FetchResult(content, title, sourceName, imageUrls);
    }

    private String extractContent(Document doc) {
        String[] selectors = {
            "article", ".article-body", ".story-body", ".post-content", 
            ".entry-content", ".content", ".article-content", ".story-content",
            ".post-body", ".body-text", ".article-text", "main p", ".content p",
            "div[itemprop='articleBody']", ".article__body", ".post__body"
        };
        
        for (String selector : selectors) {
            try {
                Elements elements = doc.select(selector);
                if (!elements.isEmpty()) {
                    String text = elements.text();
                    if (text.length() > 200) {
                        return text.replaceAll("\\s+", " ").trim();
                    }
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        return doc.select("p").text().replaceAll("\\s+", " ").trim();
    }

    private String extractTitle(Document doc) {
        String title = doc.select("meta[property=og:title]").attr("content");
        if (title == null || title.isEmpty()) {
            title = doc.select("meta[name=twitter:title]").attr("content");
        }
        if (title == null || title.isEmpty()) {
            title = doc.title();
        }
        return title != null && !title.isEmpty() ? title : "Untitled Article";
    }

    private List<String> extractImages(Document doc, String baseUrl) {
        List<String> imageUrls = new ArrayList<>();
        String baseDomain = baseUrl.replaceAll("^(https?://[^/]+).*$", "$1");

        Elements images = doc.select("img");
        for (Element img : images) {
            String src = img.attr("src");
            String resolvedUrl = resolveImageUrl(src, baseDomain, baseUrl);
            
            if (resolvedUrl != null && isValidImageUrl(resolvedUrl)) {
                imageUrls.add(resolvedUrl);
            }
            if (imageUrls.size() >= MAX_IMAGES) break;
        }

        if (imageUrls.size() < MAX_IMAGES) {
            Elements pictureSources = doc.select("picture source");
            for (Element source : pictureSources) {
                String srcset = source.attr("srcset");
                if (srcset != null && !srcset.isEmpty()) {
                    String firstUrl = srcset.split(",")[0].trim().split(" ")[0];
                    String resolvedUrl = resolveImageUrl(firstUrl, baseDomain, baseUrl);
                    if (resolvedUrl != null && isValidImageUrl(resolvedUrl) && !imageUrls.contains(resolvedUrl)) {
                        imageUrls.add(resolvedUrl);
                    }
                }
                if (imageUrls.size() >= MAX_IMAGES) break;
            }
        }

        return imageUrls;
    }

    private String resolveImageUrl(String src, String baseDomain, String baseUrl) {
        if (src == null || src.isEmpty()) return null;
        
        if (src.startsWith("http://") || src.startsWith("https://")) {
            return src;
        }
        
        if (src.startsWith("//")) {
            return "https:" + src;
        }
        
        if (src.startsWith("/")) {
            return baseDomain + src;
        }
        
        String path = baseUrl.replaceAll("^(https?://[^/]+/).*$", "$1");
        return path + src;
    }

    private boolean isValidImageUrl(String url) {
        String lowerUrl = url.toLowerCase();
        return lowerUrl.matches(".*\\.(jpg|jpeg|png|gif|webp|bmp|svg)(\\?.*)?$") ||
               lowerUrl.contains("image") || 
               lowerUrl.contains("img") ||
               lowerUrl.contains("photo");
    }

    private void validateUrlExists(String url) throws Exception {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setInstanceFollowRedirects(true);
            
            int responseCode = connection.getResponseCode();
            
            if (responseCode >= 400) {
                String message;
                switch (responseCode) {
                    case 404:
                        message = "The URL does not exist (404). Please check if the URL is correct.";
                        break;
                    case 403:
                        message = "Access to this URL is forbidden (403). The website may be blocking access.";
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        message = "The website is currently experiencing server issues (" + responseCode + "). Please try again later.";
                        break;
                    default:
                        message = "URL returned error: " + responseCode + ". Please check if the URL is correct.";
                }
                throw new Exception(message);
            }
            
            connection.disconnect();
            
        } catch (java.net.UnknownHostException e) {
            throw new Exception("The domain name could not be resolved. Please check if the URL is correct.");
        } catch (java.net.ConnectException e) {
            throw new Exception("Could not connect to the server. Please check your internet connection or try again later.");
        } catch (java.net.SocketTimeoutException e) {
            throw new Exception("Connection timed out. The website may be slow or unavailable.");
        } catch (Exception e) {
            throw new Exception("Cannot access URL: " + e.getMessage());
        }
    }

    private String extractDomain(String url) {
        try {
            return url.replaceAll("^(https?://)?(www\\.)?", "")
                     .replaceAll("/.*$", "");
        } catch (Exception e) {
            return "Unknown";
        }
    }

    public String sanitizeContent(String content) {
        if (content == null) return null;
        return content.replaceAll("\\s+", " ").trim();
    }

    public String extractTitle(String content) {
        if (content == null || content.isEmpty()) return "Untitled";
        String[] lines = content.split("\n");
        for (String line : lines) {
            line = line.trim();
            if (line.length() > 10 && line.length() < 200 && !line.matches("^[^a-zA-Z]+$")) {
                return line;
            }
        }
        String[] words = content.split(" ");
        if (words.length > 10) {
            return String.join(" ", java.util.Arrays.copyOf(words, 10)) + "...";
        }
        return content.substring(0, Math.min(50, content.length()));
    }
}