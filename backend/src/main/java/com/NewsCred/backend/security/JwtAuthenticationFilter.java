package com.NewsCred.backend.security;

import com.NewsCred.backend.util.JwtUtil;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
                                    throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        
        // Check if Authorization header exists and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract token (remove "Bearer " prefix)
        final String token = authHeader.substring(7);
        
        try {
            // Extract username from token
            final String username = jwtUtil.extractUsername(token);
            
            // If username exists and no authentication is set yet
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                
                // Load user details
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                // Validate token
                if (jwtUtil.validateToken(token, username)) {
                    
                    // Create authentication token
                    UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(
                            userDetails, 
                            null, 
                            userDetails.getAuthorities()
                        );
                    
                    // Set details
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // Set authentication in context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Token validation failed - continue without authentication
        }
        
        // Continue the filter chain
        filterChain.doFilter(request, response);
    }
}