package com.NewsCred.backend.controller;

import com.NewsCred.backend.entity.Payment;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.PaymentRepository;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.PaystackService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock private PaystackService paystackService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private UserRepository userRepository;

    private PaymentController controller;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        controller = new PaymentController(paystackService, paymentRepository, userRepository);
    }

    private User buildUser(boolean premium) {
        User user = new User();
        user.setId("user-1");
        user.setEmail("payer@example.com");
        user.setPremium(premium);
        return user;
    }

    private JsonNode json(String rawJson) throws Exception {
        return objectMapper.readTree(rawJson);
    }

    // ---------- initialize ----------

    @Test
    void initializeRejectsUnauthenticatedUser() {
        ResponseEntity<?> response = controller.initialize(null);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void initializeRejectsAlreadyPremiumUser() {
        ResponseEntity<?> response = controller.initialize(buildUser(true));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void initializeFailsCleanlyWhenPaystackNotConfigured() {
        when(paystackService.isConfigured()).thenReturn(false);

        ResponseEntity<?> response = controller.initialize(buildUser(false));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    }

    @Test
    void initializeStartsATransactionAndPersistsAPendingPayment() throws Exception {
        when(paystackService.isConfigured()).thenReturn(true);
        when(paystackService.getPremiumAmountPesewas()).thenReturn(1500L);
        when(paystackService.getCurrency()).thenReturn("GHS");
        when(paystackService.initializeTransaction("payer@example.com")).thenReturn(
            json("{\"reference\":\"ref-123\",\"authorization_url\":\"https://paystack.com/pay/ref-123\"}"));

        ResponseEntity<?> response = controller.initialize(buildUser(false));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("ref-123", body.get("reference"));
        assertEquals("https://paystack.com/pay/ref-123", body.get("authorizationUrl"));

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertEquals("PENDING", captor.getValue().getStatus());
        assertEquals("ref-123", captor.getValue().getReference());
        assertEquals("user-1", captor.getValue().getUserId());
    }

    // ---------- verify ----------

    @Test
    void verifyRejectsUnauthenticatedUser() {
        ResponseEntity<?> response = controller.verify(null, "ref-1");
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void verifyReturnsNotFoundForUnknownReference() {
        when(paymentRepository.findByReference("missing")).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller.verify(buildUser(false), "missing");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void verifyReturnsNotFoundWhenPaymentBelongsToAnotherUser() {
        Payment payment = new Payment();
        payment.setUserId("someone-else");
        payment.setReference("ref-1");
        payment.setStatus("PENDING");
        when(paymentRepository.findByReference("ref-1")).thenReturn(Optional.of(payment));

        ResponseEntity<?> response = controller.verify(buildUser(false), "ref-1");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verifyNoInteractions(paystackService);
    }

    @Test
    void verifyIsIdempotentForAlreadySuccessfulPayment() {
        Payment payment = new Payment();
        payment.setUserId("user-1");
        payment.setReference("ref-1");
        payment.setStatus("SUCCESS");
        when(paymentRepository.findByReference("ref-1")).thenReturn(Optional.of(payment));

        ResponseEntity<?> response = controller.verify(buildUser(true), "ref-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verifyNoInteractions(paystackService);
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyGrantsPremiumWhenPaystackConfirmsSuccessAndAmountMatches() throws Exception {
        Payment payment = new Payment();
        payment.setUserId("user-1");
        payment.setReference("ref-1");
        payment.setStatus("PENDING");
        payment.setAmount(1500L);
        payment.setCurrency("GHS");
        when(paymentRepository.findByReference("ref-1")).thenReturn(Optional.of(payment));
        when(paystackService.verifyTransaction("ref-1")).thenReturn(
            json("{\"status\":\"success\",\"amount\":1500,\"currency\":\"GHS\"}"));

        User user = buildUser(false);
        ResponseEntity<?> response = controller.verify(user, "ref-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(user.isPremium());
        assertEquals("SUCCESS", payment.getStatus());
        verify(userRepository).save(user);
    }

    @Test
    void verifyRejectsWhenPaidAmountIsLessThanExpected() throws Exception {
        // Regression guard: a partial/underpaid transaction must never grant premium.
        Payment payment = new Payment();
        payment.setUserId("user-1");
        payment.setReference("ref-1");
        payment.setStatus("PENDING");
        payment.setAmount(1500L);
        payment.setCurrency("GHS");
        when(paymentRepository.findByReference("ref-1")).thenReturn(Optional.of(payment));
        when(paystackService.verifyTransaction("ref-1")).thenReturn(
            json("{\"status\":\"success\",\"amount\":500,\"currency\":\"GHS\"}"));

        User user = buildUser(false);
        ResponseEntity<?> response = controller.verify(user, "ref-1");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(user.isPremium());
        assertEquals("FAILED", payment.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyRejectsWhenPaystackStatusIsNotSuccess() throws Exception {
        Payment payment = new Payment();
        payment.setUserId("user-1");
        payment.setReference("ref-1");
        payment.setStatus("PENDING");
        payment.setAmount(1500L);
        payment.setCurrency("GHS");
        when(paymentRepository.findByReference("ref-1")).thenReturn(Optional.of(payment));
        when(paystackService.verifyTransaction("ref-1")).thenReturn(
            json("{\"status\":\"failed\",\"amount\":1500,\"currency\":\"GHS\"}"));

        User user = buildUser(false);
        ResponseEntity<?> response = controller.verify(user, "ref-1");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(user.isPremium());
        assertEquals("FAILED", payment.getStatus());
    }
}
