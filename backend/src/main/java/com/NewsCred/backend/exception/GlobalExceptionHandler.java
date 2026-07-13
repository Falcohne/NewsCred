package com.NewsCred.backend.exception;

import com.NewsCred.backend.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ErrorResponse errorResponse = new ErrorResponse(
            "VALIDATION_ERROR",
            "Validation failed: " + errors.toString()
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.warn("Validation error: {}", errors);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler({UsernameNotFoundException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationExceptions(Exception ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "AUTH_ERROR",
            ex.getMessage()
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.warn("Authentication error: {}", ex.getMessage());
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "ACCESS_DENIED",
            "You do not have permission to access this resource"
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.warn("Access denied: {}", ex.getMessage());
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "VALIDATION_ERROR",
            ex.getMessage()
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.warn("Illegal argument: {}", ex.getMessage());
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "RUNTIME_ERROR",
            ex.getMessage()
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.error("Runtime error: {}", ex.getMessage(), ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFoundException(NoHandlerFoundException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "NOT_FOUND",
            "The requested resource was not found"
        );
        errorResponse.setPath(request.getDescription(false));
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
            "SERVER_ERROR",
            "An unexpected error occurred"
        );
        errorResponse.setPath(request.getDescription(false));
        
        logger.error("Unexpected error: {}", ex.getMessage(), ex);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}