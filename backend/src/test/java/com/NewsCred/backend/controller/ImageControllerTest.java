package com.NewsCred.backend.controller;

import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.ImageForensicsService;
import com.NewsCred.backend.service.ImageForensicsService.ImageForensicsResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImageControllerTest {

    @Mock private ImageForensicsService imageForensicsService;
    @Mock private UserRepository userRepository;

    private ImageController controller;

    private User buildUser(boolean premium, int analysisCount) {
        User user = new User();
        user.setId("user-1");
        user.setPremium(premium);
        user.setAnalysisCount(analysisCount);
        return user;
    }

    private ImageForensicsResult forensicsResult(double probability) {
        ImageForensicsResult r = new ImageForensicsResult();
        r.setAttempted(true);
        r.setAvailable(true);
        r.setAiGeneratedProbability(probability);
        return r;
    }

    private void setUp() {
        controller = new ImageController(imageForensicsService, userRepository);
    }

    @Test
    void rejectsUnauthenticatedUser() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeImage(null, file);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verifyNoInteractions(imageForensicsService);
    }

    @Test
    void rejectsWhenFreeTierLimitReached() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeImage(buildUser(false, ArticleController.FREE_ANALYSIS_LIMIT), file);

        assertEquals(HttpStatus.PAYMENT_REQUIRED, response.getStatusCode());
        verifyNoInteractions(imageForensicsService);
    }

    @Test
    void premiumUserBypassesFreeTierLimit() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});
        when(imageForensicsService.analyze(any(), any())).thenReturn(forensicsResult(0.2));

        ResponseEntity<?> response = controller.analyzeImage(buildUser(true, 999), file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void rejectsEmptyFile() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", new byte[0]);

        ResponseEntity<?> response = controller.analyzeImage(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(imageForensicsService);
    }

    @Test
    void rejectsNonImageContentType() {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        ResponseEntity<?> response = controller.analyzeImage(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(imageForensicsService);
    }

    @Test
    void rejectsOversizedFile() {
        setUp();
        byte[] tooBig = new byte[9 * 1024 * 1024]; // 9MB > 8MB limit
        MockMultipartFile file = new MockMultipartFile("image", "big.jpg", "image/jpeg", tooBig);

        ResponseEntity<?> response = controller.analyzeImage(buildUser(false, 0), file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(imageForensicsService);
    }

    @Test
    void successfulAnalysisIncrementsAnalysisCountAndReturnsResult() throws Exception {
        setUp();
        MockMultipartFile file = new MockMultipartFile("image", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});
        when(imageForensicsService.analyze(any(), any())).thenReturn(forensicsResult(0.85));
        User user = buildUser(false, 1);

        ResponseEntity<?> response = controller.analyzeImage(user, file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, user.getAnalysisCount());
        verify(userRepository).save(user);
        verify(imageForensicsService).analyze(new byte[]{1, 2, 3}, "photo.jpg");
    }
}
