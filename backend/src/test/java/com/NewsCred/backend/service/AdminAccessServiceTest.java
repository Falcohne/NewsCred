package com.NewsCred.backend.service;

import com.NewsCred.backend.entity.User;
import com.NewsCred.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAccessServiceTest {

    @Mock
    private UserRepository userRepository;

    private User userWithEmail(String email, boolean admin) {
        User user = new User();
        user.setEmail(email);
        user.setAdmin(admin);
        return user;
    }

    @Test
    void promotesUserWhoseEmailIsOnTheAllowlist() {
        AdminAccessService service = new AdminAccessService(userRepository, "boss@newscred.dev, teammate@newscred.dev");
        User user = userWithEmail("boss@newscred.dev", false);

        service.syncAdminStatus(user);

        assertTrue(user.isAdmin());
        verify(userRepository).save(user);
    }

    @Test
    void allowlistMatchIsCaseAndWhitespaceInsensitive() {
        AdminAccessService service = new AdminAccessService(userRepository, " Boss@NewsCred.dev ");
        User user = userWithEmail("boss@newscred.dev", false);

        service.syncAdminStatus(user);

        assertTrue(user.isAdmin());
    }

    @Test
    void doesNotPromoteUserNotOnAllowlist() {
        AdminAccessService service = new AdminAccessService(userRepository, "boss@newscred.dev");
        User user = userWithEmail("random@newscred.dev", false);

        service.syncAdminStatus(user);

        assertFalse(user.isAdmin());
        verify(userRepository, never()).save(any());
    }

    @Test
    void demotesAdminWhoseEmailWasRemovedFromAllowlist() {
        // Regression test for the gap noted in SETUP-SECURITY.md: removing an
        // email from ADMIN_EMAILS used to have no effect on existing admins.
        AdminAccessService service = new AdminAccessService(userRepository, "still-admin@newscred.dev");
        User user = userWithEmail("removed-admin@newscred.dev", true);

        service.syncAdminStatus(user);

        assertFalse(user.isAdmin());
        verify(userRepository).save(user);
    }

    @Test
    void emptyAllowlistDemotesEveryone() {
        AdminAccessService service = new AdminAccessService(userRepository, "");
        User user = userWithEmail("someone@newscred.dev", true);

        service.syncAdminStatus(user);

        assertFalse(user.isAdmin());
    }

    @Test
    void noOpWhenStatusAlreadyMatchesAllowlist() {
        AdminAccessService service = new AdminAccessService(userRepository, "boss@newscred.dev");
        User user = userWithEmail("boss@newscred.dev", true);

        service.syncAdminStatus(user);

        verify(userRepository, never()).save(any());
    }

    @Test
    void ignoresNullUserOrNullEmail() {
        AdminAccessService service = new AdminAccessService(userRepository, "boss@newscred.dev");

        assertDoesNotThrow(() -> service.syncAdminStatus(null));
        assertDoesNotThrow(() -> service.syncAdminStatus(new User()));
        verifyNoInteractions(userRepository);
    }
}
