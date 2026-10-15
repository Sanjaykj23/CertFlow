package com.certflow.api.service;

import com.certflow.api.repository.OrganizationMemberRepository;
import com.certflow.api.repository.OrganizationRepository;
import com.certflow.api.repository.UserRepository;
import com.certflow.api.security.JwtTokenProvider;
import com.certflow.common.domain.Organization;
import com.certflow.common.domain.OrganizationMember;
import com.certflow.common.domain.User;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.AuthDtos;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final JdbcTemplate jdbcTemplate;
    private final JavaMailSender mailSender;

    @Value("${certflow.email.from:no-reply@certflow.io}")
    private String fromEmail;

    @Value("${certflow.email.from-name:CertFlow Platform}")
    private String fromName;

    public AuthService(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository memberRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            JdbcTemplate jdbcTemplate,
            @Autowired(required = false) JavaMailSender mailSender
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.jdbcTemplate = jdbcTemplate;
        this.mailSender = mailSender;
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int num = 100000 + random.nextInt(900000);
        return String.valueOf(num);
    }

    public void sendEmailOtp(String toEmail, String otpCode, String subject, String headline, String bodyText) {
        if (mailSender == null) {
            log.warn("MailSender not configured, OTP for {} is: {}", toEmail, otpCode);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String html = """
                <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:16px;border:1px solid #1e293b;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <h2 style="color:#38bdf8;margin:0;font-size:24px;">CertFlow Platform</h2>
                        <p style="color:#94a3b8;font-size:14px;margin-top:6px;">Distributed Certificate & Credential Infrastructure</p>
                    </div>
                    <div style="background:#1e293b;border-radius:12px;padding:24px;border:1px solid #334155;text-align:center;">
                        <h3 style="color:#ffffff;margin-top:0;">%s</h3>
                        <p style="color:#cbd5e1;font-size:14px;line-height:1.5;">%s</p>
                        <div style="margin:28px 0;">
                            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#38bdf8;background:#0f172a;padding:12px 24px;border-radius:8px;border:1px dashed #0284c7;display:inline-block;font-family:monospace;">%s</span>
                        </div>
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:0;">This verification code is valid for 10 minutes. Do not share it with anyone.</p>
                    </div>
                    <p style="color:#64748b;font-size:11px;text-align:center;margin-top:24px;">&copy; 2026 CertFlow. All rights reserved.</p>
                </div>
            """.formatted(headline, bodyText, otpCode);

            helper.setText(html, true);
            mailSender.send(message);
            log.info("Sent verification email to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}. Note: Check your Gmail App Password.", toEmail, e.getMessage());
            // Log clearly so the user/admin can still get the code from database/logs if SMTP fails
            log.warn(">>> [DEV / FALLBACK] Verification OTP for {}: {} <<<", toEmail, otpCode);
        }
    }

    @Transactional
    public void initiateRegistrationOtp(AuthDtos.RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new IllegalArgumentException("User with email " + cleanEmail + " already exists. Please log in.");
        }

        String otp = generateOtp();
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        // Invalidate prior registration OTPs for this email
        jdbcTemplate.update("DELETE FROM email_verification_tokens WHERE email = ? AND token_type = 'REGISTER_OTP'", cleanEmail);

        String orgName = (request.getOrganizationName() != null && !request.getOrganizationName().isBlank())
                ? request.getOrganizationName().trim()
                : request.getFullName().trim() + "'s Org";

        jdbcTemplate.update(
                "INSERT INTO email_verification_tokens (id, email, otp_code, token_type, full_name, password_hash, organization_name, expires_at, verified, created_at) VALUES (?, ?, ?, 'REGISTER_OTP', ?, ?, ?, ?, false, ?)",
                UUID.randomUUID(), cleanEmail, otp, request.getFullName().trim(), passwordEncoder.encode(request.getPassword()), orgName, java.sql.Timestamp.from(expiresAt), java.sql.Timestamp.from(Instant.now())
        );

        sendEmailOtp(cleanEmail, otp, "Your CertFlow Verification Code", "Verify Your Email",
                "Enter the 6-digit verification code below to complete creating your account.");
    }

    @Transactional
    public AuthDtos.AuthResponse verifyRegistrationOtp(AuthDtos.VerifyOtpRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String sql = "SELECT * FROM email_verification_tokens WHERE email = ? AND token_type = 'REGISTER_OTP' AND verified = false ORDER BY created_at DESC LIMIT 1";

        List<java.util.Map<String, Object>> rows = jdbcTemplate.queryForList(sql, cleanEmail);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("No pending verification found for " + cleanEmail);
        }

        java.util.Map<String, Object> tokenRow = rows.get(0);
        String expectedOtp = (String) tokenRow.get("otp_code");
        Instant expiresAt = ((java.sql.Timestamp) tokenRow.get("expires_at")).toInstant();

        if (Instant.now().isAfter(expiresAt)) {
            throw new IllegalArgumentException("Verification code has expired. Please request a new one.");
        }

        if (!expectedOtp.trim().equals(request.getOtp().trim())) {
            throw new IllegalArgumentException("Invalid verification code. Please check your email and try again.");
        }

        // Mark verified
        jdbcTemplate.update("UPDATE email_verification_tokens SET verified = true WHERE id = ?", tokenRow.get("id"));

        // Create user
        String fullName = (String) tokenRow.get("full_name");
        String passwordHash = (String) tokenRow.get("password_hash");
        String orgName = (String) tokenRow.get("organization_name");

        User user = User.builder()
                .email(cleanEmail)
                .passwordHash(passwordHash)
                .fullName(fullName)
                .build();
        user = userRepository.save(user);

        String slug = toSlug(orgName) + "-" + UUID.randomUUID().toString().substring(0, 6);
        Organization organization = Organization.builder()
                .name(orgName)
                .slug(slug)
                .build();
        organization = organizationRepository.save(organization);

        OrganizationMember member = OrganizationMember.builder()
                .organizationId(organization.getId())
                .userId(user.getId())
                .role(UserRole.OWNER)
                .build();
        memberRepository.save(member);

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getFullName());
        List<AuthDtos.OrgMembershipDto> orgs = organizationRepository.findOrganizationsByUserId(user.getId());

        AuthDtos.UserDto userDto = AuthDtos.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .organizations(orgs)
                .build();

        return AuthDtos.AuthResponse.builder()
                .token(token)
                .user(userDto)
                .build();
    }

    @Transactional
    public void forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found with email " + cleanEmail));

        String otp = generateOtp();
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        jdbcTemplate.update("DELETE FROM email_verification_tokens WHERE email = ? AND token_type = 'RESET_PASSWORD_OTP'", cleanEmail);

        jdbcTemplate.update(
                "INSERT INTO email_verification_tokens (id, email, otp_code, token_type, expires_at, verified, created_at) VALUES (?, ?, ?, 'RESET_PASSWORD_OTP', ?, false, ?)",
                UUID.randomUUID(), cleanEmail, otp, java.sql.Timestamp.from(expiresAt), java.sql.Timestamp.from(Instant.now())
        );

        sendEmailOtp(cleanEmail, otp, "CertFlow Password Reset Code", "Reset Your Password",
                "You requested a password reset. Enter the 6-digit code below to set a new password.");
    }

    @Transactional
    public void resetPasswordWithOtp(AuthDtos.ResetPasswordWithOtpRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String sql = "SELECT * FROM email_verification_tokens WHERE email = ? AND token_type = 'RESET_PASSWORD_OTP' AND verified = false ORDER BY created_at DESC LIMIT 1";

        List<java.util.Map<String, Object>> rows = jdbcTemplate.queryForList(sql, cleanEmail);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("No pending password reset request found for " + cleanEmail);
        }

        java.util.Map<String, Object> tokenRow = rows.get(0);
        String expectedOtp = (String) tokenRow.get("otp_code");
        Instant expiresAt = ((java.sql.Timestamp) tokenRow.get("expires_at")).toInstant();

        if (Instant.now().isAfter(expiresAt)) {
            throw new IllegalArgumentException("Reset code has expired. Please request a new one.");
        }

        if (!expectedOtp.trim().equals(request.getOtp().trim())) {
            throw new IllegalArgumentException("Invalid reset code. Please try again.");
        }

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.updatePassword(user.getId(), user.getPasswordHash());

        jdbcTemplate.update("UPDATE email_verification_tokens SET verified = true WHERE id = ?", tokenRow.get("id"));
        log.info("Password reset successfully for user {}", cleanEmail);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getFullName());
        List<AuthDtos.OrgMembershipDto> orgs = organizationRepository.findOrganizationsByUserId(user.getId());

        AuthDtos.UserDto userDto = AuthDtos.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .organizations(orgs)
                .build();

        return AuthDtos.AuthResponse.builder()
                .token(token)
                .user(userDto)
                .build();
    }

    public AuthDtos.UserDto getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<AuthDtos.OrgMembershipDto> orgs = organizationRepository.findOrganizationsByUserId(user.getId());

        return AuthDtos.UserDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .organizations(orgs)
                .build();
    }

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private static String toSlug(String input) {
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("").toLowerCase(Locale.ENGLISH);
        return slug.replaceAll("-+", "-");
    }
}
