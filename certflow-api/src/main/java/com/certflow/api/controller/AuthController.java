package com.certflow.api.controller;

import com.certflow.api.security.UserPrincipal;
import com.certflow.api.service.AuthService;
import com.certflow.common.dto.ApiResponse;
import com.certflow.common.dto.AuthDtos;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.initiateRegistrationOtp(request);
        return ResponseEntity.ok(ApiResponse.ok("Verification code sent to " + request.getEmail(), null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> verifyOtp(@Valid @RequestBody AuthDtos.VerifyOtpRequest request) {
        AuthDtos.AuthResponse response = authService.verifyRegistrationOtp(request);
        return ResponseEntity.ok(ApiResponse.ok("Email verified and account created successfully", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Password reset code sent to " + request.getEmail(), null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordWithOtpRequest request) {
        authService.resetPasswordWithOtp(request);
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully. You can now log in.", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDtos.AuthResponse>> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        AuthDtos.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthDtos.UserDto>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }
        AuthDtos.UserDto user = authService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }
}
