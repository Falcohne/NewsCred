package com.NewsCred.backend.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DateVerificationService {

    private static final int MAX_AGE_DAYS = 7;
    private static final int MAX_AGE_DAYS_WARNING = 30;
    private static final int MAX_AGE_DAYS_OLD = 90;

    private static final List<String> DATE_PATTERNS = Arrays.asList(
        "MMMM d, yyyy",
        "MMM d, yyyy",
        "MMMM dd, yyyy",
        "MMM dd, yyyy",
        "d MMMM yyyy",
        "d MMM yyyy",
        "yyyy-MM-dd",
        "MM/dd/yyyy",
        "MM/dd/yy",
        "dd/MM/yyyy",
        "dd/MM/yy",
        "yyyy/MM/dd",
        "d MMMM yyyy",
        "MMM d, yyyy",
        "yyyy.MM.dd",
        "dd.MM.yyyy",
        "MMM dd, yyyy",
        "MMMM dd, yyyy",
        "yyyy/MM/dd",
        "dd-MM-yyyy",
        "yyyy-MM-dd",
        "MM.dd.yyyy",
        "dd.MM.yyyy"
    );

    private static final List<String> DATE_REGEX_PATTERNS = Arrays.asList(
        "(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}",
        "\\d{1,2}\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}",
        "\\d{4}-\\d{2}-\\d{2}",
        "\\d{1,2}/\\d{1,2}/\\d{2,4}",
        "Published:\\s*(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}",
        "Updated:\\s*(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}",
        "Date:\\s*\\d{1,2}/\\d{1,2}/\\d{2,4}",
        "Posted:\\s*(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}",
        "(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(st|nd|rd|th)?,\\s+\\d{4}",
        "\\d{4}\\.\\d{2}\\.\\d{2}",
        "\\d{2}\\.\\d{2}\\.\\d{4}",
        "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},\\s+\\d{4}",
        "\\d{1,2}\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{4}",
        "Published:\\s*\\d{1,2}\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}",
        "Last updated:\\s*(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}",
        "\\d{1,2}-\\d{1,2}-\\d{4}",
        "\\d{4}-\\d{1,2}-\\d{1,2}",
        "\\d{2}\\.\\d{2}\\.\\d{4}"
    );

    private static final List<String> TIMELESS_KEYWORDS = Arrays.asList(
        "history", "historical", "ancient", "century", "decade",
        "science", "scientific", "discovery", "invention",
        "philosophy", "philosophical", "art", "music", "literature",
        "evolution", "geology", "astronomy", "space", "universe",
        "biology", "chemistry", "physics", "mathematics",
        "culture", "tradition", "heritage", "archaeology",
        "classic", "timeless", "evergreen", "enduring",
        "biography", "memoir", "historical event", "documentary"
    );

    public DateVerificationResult verifyDate(String content, String url) {
        DateVerificationResult result = new DateVerificationResult();
        
        LocalDate publishDate = extractDateFromContent(content);
        
        if (publishDate == null) {
            publishDate = extractDateFromUrl(url);
        }
        
        if (publishDate == null) {
            result.setDateFound(false);
            result.setStatus("DATE_UNKNOWN");
            result.setMessage("Could not determine the publish date of this article.");
            result.setRecommendation("Check the article for a publication date before sharing.");
            result.setScore(0.5);
            return result;
        }
        
        LocalDate currentDate = LocalDate.now();
        long daysBetween = ChronoUnit.DAYS.between(publishDate, currentDate);
        
        result.setPublishDate(publishDate);
        result.setCurrentDate(currentDate);
        result.setDaysOld(daysBetween);
        result.setDateFound(true);
        
        boolean isTimeless = isTimelessTopic(content);
        result.setTimeless(isTimeless);
        
        if (daysBetween <= MAX_AGE_DAYS) {
            result.setStatus("RECENT");
            result.setMessage("This article is recent (less than " + MAX_AGE_DAYS + " days old).");
            result.setScore(1.0);
            result.setRecommendation("This article is recent and likely relevant.");
        } else if (daysBetween <= MAX_AGE_DAYS_WARNING) {
            result.setStatus("MODERATELY_OLD");
            result.setMessage("This article is " + daysBetween + " days old.");
            result.setScore(0.7);
            result.setRecommendation("This article is " + daysBetween + " days old. Verify that the information is still current.");
        } else if (daysBetween <= MAX_AGE_DAYS_OLD) {
            result.setStatus("OLD");
            result.setMessage("This article is " + daysBetween + " days old (over " + MAX_AGE_DAYS_WARNING + " days).");
            result.setScore(0.4);
            result.setRecommendation("This article is " + daysBetween + " days old. Information may be outdated.");
        } else {
            result.setStatus("OUTDATED");
            result.setMessage("This article is " + daysBetween + " days old (over " + MAX_AGE_DAYS_OLD + " days).");
            result.setScore(0.2);
            result.setRecommendation("This article is significantly outdated. Information may no longer be accurate.");
        }
        
        if (isTimeless && daysBetween > MAX_AGE_DAYS_WARNING) {
            result.setMessage(result.getMessage() + " However, this appears to be about a timeless topic.");
            result.setScore(Math.min(result.getScore() + 0.2, 1.0));
            result.setRecommendation("This article covers a timeless topic. Age is less of a concern.");
        }
        
        return result;
    }

    private LocalDate extractDateFromContent(String content) {
        if (content == null || content.isEmpty()) return null;
        
        String text = content.substring(0, Math.min(content.length(), 5000));
        
        for (String regex : DATE_REGEX_PATTERNS) {
            Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    String dateStr = matcher.group();
                    LocalDate parsedDate = parseDateString(dateStr);
                    if (parsedDate != null) {
                        return parsedDate;
                    }
                } catch (DateTimeParseException e) {
                    continue;
                }
            }
        }
        
        return null;
    }

    private LocalDate extractDateFromUrl(String url) {
        if (url == null || url.isEmpty()) return null;
        
        Pattern pattern = Pattern.compile("/(\\d{4})/(\\d{2})/(\\d{2})/");
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) {
            try {
                int year = Integer.parseInt(matcher.group(1));
                int month = Integer.parseInt(matcher.group(2));
                int day = Integer.parseInt(matcher.group(3));
                if (year >= 2000 && year <= LocalDate.now().getYear() + 1 && 
                    month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return LocalDate.of(year, month, day);
                }
            } catch (NumberFormatException e) {
            }
        }
        
        pattern = Pattern.compile("/(\\d{4})-(\\d{2})-(\\d{2})");
        matcher = pattern.matcher(url);
        if (matcher.find()) {
            try {
                int year = Integer.parseInt(matcher.group(1));
                int month = Integer.parseInt(matcher.group(2));
                int day = Integer.parseInt(matcher.group(3));
                if (year >= 2000 && year <= LocalDate.now().getYear() + 1 && 
                    month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return LocalDate.of(year, month, day);
                }
            } catch (NumberFormatException e) {
            }
        }
        
        pattern = Pattern.compile("/(\\d{4})/(\\d{2})/");
        matcher = pattern.matcher(url);
        if (matcher.find()) {
            try {
                int year = Integer.parseInt(matcher.group(1));
                int month = Integer.parseInt(matcher.group(2));
                if (year >= 2000 && year <= LocalDate.now().getYear() + 1 && 
                    month >= 1 && month <= 12) {
                    return LocalDate.of(year, month, 1);
                }
            } catch (NumberFormatException e) {
            }
        }
        
        return null;
    }

    private LocalDate parseDateString(String dateStr) {
        String cleanDate = dateStr.replaceAll("Published:\\s*", "")
                                   .replaceAll("Updated:\\s*", "")
                                   .replaceAll("Date:\\s*", "")
                                   .replaceAll("Posted:\\s*", "")
                                   .replaceAll("Last updated:\\s*", "")
                                   .replaceAll("(st|nd|rd|th),", ",")
                                   .trim();
        
        for (String format : DATE_PATTERNS) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                return LocalDate.parse(cleanDate, formatter);
            } catch (DateTimeParseException e) {
                continue;
            }
        }
        
        return null;
    }

    private boolean isTimelessTopic(String content) {
        if (content == null) return false;
        String lower = content.toLowerCase();
        
        for (String keyword : TIMELESS_KEYWORDS) {
            if (lower.contains(keyword)) {
                return true;
            }
        }
        
        return false;
    }

    public static class DateVerificationResult {
        private LocalDate publishDate;
        private LocalDate currentDate;
        private long daysOld;
        private boolean dateFound;
        private boolean timeless;
        private String status;
        private String message;
        private String recommendation;
        private double score;

        public LocalDate getPublishDate() { return publishDate; }
        public void setPublishDate(LocalDate publishDate) { this.publishDate = publishDate; }
        public LocalDate getCurrentDate() { return currentDate; }
        public void setCurrentDate(LocalDate currentDate) { this.currentDate = currentDate; }
        public long getDaysOld() { return daysOld; }
        public void setDaysOld(long daysOld) { this.daysOld = daysOld; }
        public boolean isDateFound() { return dateFound; }
        public void setDateFound(boolean dateFound) { this.dateFound = dateFound; }
        public boolean isTimeless() { return timeless; }
        public void setTimeless(boolean timeless) { this.timeless = timeless; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }

        public String getStatusLabel() {
            switch (status) {
                case "RECENT": return "Recent";
                case "MODERATELY_OLD": return "Moderately Old";
                case "OLD": return "Old";
                case "OUTDATED": return "Outdated";
                case "DATE_UNKNOWN": return "Date Unknown";
                default: return "Unknown";
            }
        }
    }
}