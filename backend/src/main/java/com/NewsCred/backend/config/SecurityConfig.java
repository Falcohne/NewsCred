package com.NewsCred.backend.config;

import com.NewsCred.backend.security.JwtAuthenticationFilter;
import com.NewsCred.backend.security.RateLimitingFilter;
import com.NewsCred.backend.util.JwtUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;

    public SecurityConfig(JwtUtil jwtUtil,
                          UserDetailsService userDetailsService,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          RateLimitingFilter rateLimitingFilter) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()

            .cors().configurationSource(corsConfigurationSource())
            .and()

            .headers().disable()

            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()

            .authorizeRequests()
                .antMatchers("/api/auth/**", "/api/auth/register", "/api/auth/login").permitAll()
                .antMatchers("/test/**", "/actuator/health", "/actuator/info").permitAll()
                .antMatchers("/api/verify/email/**").permitAll()
                .antMatchers("/api/users/**").authenticated()
                .antMatchers("/api/articles/analyze").authenticated()
                .antMatchers("/api/articles/user/**").authenticated()
                .antMatchers("/api/articles/**").authenticated()
                .anyRequest().authenticated()
            .and()

            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        String activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
        boolean isProduction = activeProfile != null && activeProfile.equals("prod");

        List<String> allowedOrigins;
        if (isProduction) {
            allowedOrigins = Arrays.asList(
                "https://yourdomain.com",
                "https://www.yourdomain.com",
                "https://newscred-app.onrender.com",
                "https://newscred.netlify.app"
            );
        } else {
            allowedOrigins = Arrays.asList(
                "http://localhost:8081",
                "http://localhost:19006",
                "http://localhost:19000",
                "http://localhost:3000",
                "http://10.0.2.2:8081",
                "http://10.0.2.2:19006",
                "http://192.168.1.100:8081",
                "http://192.168.1.100:19006"
            );
        }
        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"
        ));

        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-User-Id",
            "X-User-Premium",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining"
        ));

        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Disposition",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset"
        ));

        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}