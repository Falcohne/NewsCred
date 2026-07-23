package com.NewsCred.backend.controller;

import com.NewsCred.backend.dto.ErrorResponse;
import com.NewsCred.backend.entity.Payment;
import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.PaymentRepository;
import com.NewsCred.backend.repository.UserRepository;
import com.NewsCred.backend.service.PaystackService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Premium upgrade flow (Paystack):
 *
 *  1. App calls POST /api/payments/initialize
 *     -> backend asks Paystack for a checkout session
 *     -> returns authorization_url + reference
 *  2. App opens authorization_url in a WebView; user pays with
 *     card or Mobile Money on Paystack's secure page.
 *  3. App calls GET /api/payments/verify/{reference}
 *     -> backend confirms with Paystack that the payment succeeded
 *        AND the amount/currency match, then sets premium=true in the DB.
 *
 * The client can never grant itself premium: only a server-verified
 * Paystack transaction can.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaystackService paystackService;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    public PaymentController(PaystackService paystackService,
                             PaymentRepository paymentRepository,
                             UserRepository userRepository) {
        this.paystackService = paystackService;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/plan")
    public ResponseEntity<?> getPlan() {
        Map<String, Object> plan = new HashMap<>();
        plan.put("name", "NewsCred Premium");
        plan.put("amountPesewas", paystackService.getPremiumAmountPesewas());
        plan.put("amountDisplay", String.format("GHS %.2f",
            paystackService.getPremiumAmountPesewas() / 100.0));
        plan.put("currency", paystackService.getCurrency());
        plan.put("features", new String[] {
            "Unlimited article analyses",
            "Full claim-by-claim fact-check breakdown",
            "Author, date & image verification details",
            "Export and share full PDF-style reports",
            "5x higher rate limits",
            "Priority analysis"
        });
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/initialize")
    public ResponseEntity<?> initialize(@AuthenticationPrincipal User currentUser) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("AUTH_ERROR", "Authentication required"));
            }
            if (currentUser.isPremium()) {
                return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("ALREADY_PREMIUM", "You already have Premium"));
            }
            if (!paystackService.isConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ErrorResponse.of("PAYMENTS_UNAVAILABLE",
                        "Payments are not configured on this server. Set PAYSTACK_SECRET_KEY."));
            }

            JsonNode data = paystackService.initializeTransaction(currentUser.getEmail());
            String reference = data.path("reference").asText();

            Payment payment = new Payment();
            payment.setUserId(currentUser.getId());
            payment.setReference(reference);
            payment.setAmount(paystackService.getPremiumAmountPesewas());
            payment.setCurrency(paystackService.getCurrency());
            payment.setStatus("PENDING");
            paymentRepository.save(payment);

            Map<String, Object> response = new HashMap<>();
            response.put("authorizationUrl", data.path("authorization_url").asText());
            response.put("reference", reference);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("PAYMENT_ERROR", "Could not start payment: " + e.getMessage()));
        }
    }

    @GetMapping("/verify/{reference}")
    public ResponseEntity<?> verify(@AuthenticationPrincipal User currentUser,
                                    @PathVariable String reference) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("AUTH_ERROR", "Authentication required"));
            }

            Payment payment = paymentRepository.findByReference(reference).orElse(null);
            if (payment == null || !payment.getUserId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of("NOT_FOUND", "Payment reference not found"));
            }

            if ("SUCCESS".equals(payment.getStatus())) {
                return successResponse(currentUser);   // idempotent re-verify
            }

            JsonNode data = paystackService.verifyTransaction(reference);
            String paystackStatus = data.path("status").asText();
            long amountPaid = data.path("amount").asLong();
            String currency = data.path("currency").asText();

            boolean amountOk = amountPaid >= payment.getAmount()
                && currency.equalsIgnoreCase(payment.getCurrency());

            if ("success".equalsIgnoreCase(paystackStatus) && amountOk) {
                payment.setStatus("SUCCESS");
                payment.setPaidAt(LocalDateTime.now());
                paymentRepository.save(payment);

                currentUser.setPremium(true);
                userRepository.save(currentUser);

                return successResponse(currentUser);
            }

            payment.setStatus("FAILED");
            paymentRepository.save(payment);
            return ResponseEntity.badRequest()
                .body(ErrorResponse.of("PAYMENT_FAILED",
                    "Payment was not successful (status: " + paystackStatus + ")"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("PAYMENT_ERROR", "Verification failed: " + e.getMessage()));
        }
    }

    private ResponseEntity<?> successResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Payment verified. Welcome to Premium!");
        response.put("premium", true);
        response.put("userId", user.getId());
        return ResponseEntity.ok(response);
    }
}
