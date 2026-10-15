package com.certflow.api.service;

import com.certflow.api.repository.OrganizationMemberRepository;
import com.certflow.api.repository.OrganizationRepository;
import com.certflow.api.repository.UserRepository;
import com.certflow.common.domain.Organization;
import com.certflow.common.domain.OrganizationMember;
import com.certflow.common.domain.User;
import com.certflow.common.domain.UserRole;
import com.certflow.common.dto.AuthDtos;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final UserRepository userRepository;

    public OrganizationService(
            OrganizationRepository organizationRepository,
            OrganizationMemberRepository memberRepository,
            UserRepository userRepository
    ) {
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Organization createOrganization(UUID userId, String name) {
        String slug = name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "-") + "-" + UUID.randomUUID().toString().substring(0, 6);
        Organization org = Organization.builder()
                .name(name.trim())
                .slug(slug)
                .build();
        org = organizationRepository.save(org);

        OrganizationMember member = OrganizationMember.builder()
                .organizationId(org.getId())
                .userId(userId)
                .role(UserRole.OWNER)
                .build();
        memberRepository.save(member);

        return org;
    }

    public List<AuthDtos.OrgMembershipDto> getUserOrganizations(UUID userId) {
        return organizationRepository.findOrganizationsByUserId(userId);
    }

    public OrganizationMember verifyMembership(UUID organizationId, UUID userId, UserRole minimumRole) {
        OrganizationMember member = memberRepository.findByOrganizationAndUser(organizationId, userId)
                .orElseThrow(() -> new AccessDeniedException("User does not belong to this organization"));

        if (minimumRole != null) {
            boolean hasPermission = switch (minimumRole) {
                case OWNER -> member.getRole() == UserRole.OWNER;
                case ADMIN -> member.getRole() == UserRole.OWNER || member.getRole() == UserRole.ADMIN;
                case OPERATOR -> member.getRole() == UserRole.OWNER || member.getRole() == UserRole.ADMIN || member.getRole() == UserRole.OPERATOR;
                case VIEWER -> true;
            };

            if (!hasPermission) {
                throw new AccessDeniedException("Insufficient role: requires " + minimumRole + ", user has " + member.getRole());
            }
        }

        return member;
    }

    @Transactional
    public OrganizationMember addMember(UUID organizationId, UUID requestingUserId, String email, UserRole role) {
        verifyMembership(organizationId, requestingUserId, UserRole.ADMIN);

        User targetUser = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseGet(() -> {
                    String cleanEmail = email.trim().toLowerCase(Locale.ROOT);
                    String name = cleanEmail.split("@")[0];
                    String displayName = Character.toUpperCase(name.charAt(0)) + (name.length() > 1 ? name.substring(1) : "");
                    return userRepository.save(User.builder()
                            .id(UUID.randomUUID())
                            .email(cleanEmail)
                            .fullName(displayName)
                            .passwordHash("$2a$10$wK1Rk7t497y1V0Mh1E1B9O4a/yD0q71C7uW5gV1Q6xO9Jk4M0X5C2")
                            .build());
                });

        if (memberRepository.findByOrganizationAndUser(organizationId, targetUser.getId()).isPresent()) {
            throw new IllegalArgumentException("User is already a member of this organization");
        }

        OrganizationMember member = OrganizationMember.builder()
                .organizationId(organizationId)
                .userId(targetUser.getId())
                .role(role)
                .build();

        return memberRepository.save(member);
    }

    public List<java.util.Map<String, Object>> getMembers(UUID organizationId, UUID requestingUserId) {
        verifyMembership(organizationId, requestingUserId, UserRole.VIEWER);
        return memberRepository.findByOrganizationIdWithUserDetails(organizationId);
    }
}
