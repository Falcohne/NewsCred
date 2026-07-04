package com.NewsCred.backend.repository;

import com.NewsCred.backend.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleRepository extends JpaRepository<Article, String> {
    List<Article> findByUserId(String userId);
    List<Article> findByUserIdOrderByCreatedAtDesc(String userId);
    
    // 🟢 NEW: Delete all articles by user ID
    void deleteByUserId(String userId);
}