package com.uc.ms_security.mapper;

import com.uc.ms_security.dto.session.SessionResponseDTO;
import com.uc.ms_security.entity.Session;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class SessionMapper {

    public SessionResponseDTO toResponseDTO(Session session) {
        return new SessionResponseDTO(
                session.getId(),
                session.getExpiration(),
                session.getExpiration().isAfter(LocalDateTime.now())
        );
    }

    public List<SessionResponseDTO> toResponseDTOList(
            List<Session> sessions) {

        return sessions.stream()
                .map(this::toResponseDTO)
                .toList();
    }
}
