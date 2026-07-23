package com.NewsCred.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around the Paystack REST API.
 * Docs: https://paystack.com/docs/api/transaction/
 *
 * SECURITY: the secret key lives only on the server (PAYSTACK_SECRET_KEY env
 * var). The mobile app never sees it, and premium status is ONLY granted
 * after verify() confirms the payment with Paystack directly.
 */
@Service
public class PaystackService {

    private static final String PAYSTACK_BASE = "https://api.paystack.co";

    private final WebClient webClient;

    @Value("${paystack.secret-key:}")
    private String secretKey;

    @Value("${paystack.plan.amount-pesewas:1500}")
    private long premiumAmountPesewas;

    @Value("${paystack.currency:GHS}")
    private String currency;

    public PaystackService() {
        this.webClient = WebClient.builder().baseUrl(PAYSTACK_BASE).build();
    }

    public long getPremiumAmountPesewas() { return premiumAmountPesewas; }
    public String getCurrency() { return currency; }

    public boolean isConfigured() {
        return secretKey != null && !secretKey.isEmpty();
    }

    /**
     * Initialize a transaction. Returns Paystack's response data node
     * containing authorization_url, access_code, and reference.
     */
    public JsonNode initializeTransaction(String email) {
        Map<String, Object> body = Map.of(
            "email", email,
            "amount", premiumAmountPesewas,
            "currency", currency,
            // card + mobile money (MTN MoMo, Vodafone Cash, AirtelTigo)
            "channels", List.of("card", "mobile_money"),
            "metadata", Map.of("product", "newscred_premium")
        );

        JsonNode response = webClient.post()
            .uri("/transaction/initialize")
            .header("Authorization", "Bearer " + secretKey)
            .header("Content-Type", "application/json")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (response == null || !response.path("status").asBoolean(false)) {
            throw new RuntimeException("Paystack initialization failed: " +
                (response != null ? response.path("message").asText() : "no response"));
        }
        return response.path("data");
    }

    /**
     * Verify a transaction by reference. Returns the data node.
     * Caller MUST check status == "success" AND amount matches.
     */
    public JsonNode verifyTransaction(String reference) {
        JsonNode response = webClient.get()
            .uri("/transaction/verify/{reference}", reference)
            .header("Authorization", "Bearer " + secretKey)
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (response == null || !response.path("status").asBoolean(false)) {
            throw new RuntimeException("Paystack verification failed: " +
                (response != null ? response.path("message").asText() : "no response"));
        }
        return response.path("data");
    }
}
