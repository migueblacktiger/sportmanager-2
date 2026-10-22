package com.uc.ms_security.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.dto.user.CreateUserDTO;
import com.uc.ms_security.dto.user.UpdateUserDTO;
import com.uc.ms_security.dto.user.UserDetailResponseDTO;
import com.uc.ms_security.dto.user.UserResponseDTO;
import com.uc.ms_security.dto.user.UserRolesResponseDTO;
import com.uc.ms_security.dto.user.UserSessionsResponseDTO;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.UserMapper;
import com.uc.ms_security.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    private final UserMapper userMapper;

    private final PasswordEncoder passwordEncoder;

    public UserResponseDTO create(CreateUserDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "Ya existe un usuario con este email"
            );
        }
        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        User savedUser = userRepository.save(user);
        return userMapper.toResponseDTO(savedUser);
    }
    public List<UserResponseDTO> findAll() {
        List<User> users =userRepository.findAll();
        return userMapper.toResponseDTOList(users);
    }
    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Usuario no encontrado con id: " + id
                ));
    }

    public UserResponseDTO findById(Long id) {
        User user = findUser(id);
        return userMapper.toResponseDTO(user);
    }

    public UserDetailResponseDTO findByIdWithProfile(Long id) {
        User user = userRepository.findWithProfileById(id)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Usuario no encontrado con id: " + id
                ));
        return userMapper.toDetailResponseDTO(user);
    }

    public UserSessionsResponseDTO findByIdAndSessions(Long id) {
        User user = userRepository
                .findWithSessionsById(id)
                .orElseThrow(
                () -> new ApplicationException(
                    ErrorCase.NOT_FOUND,
                    "Usuario no encontrado con id: " + id
                    )
                );

        return userMapper.toSessionsResponseDTO(user);
    }

    public UserRolesResponseDTO findByIdAndRoles(Long id) {
        User user = userRepository
                .findWithRolesById(id)
                .orElseThrow(
                        () -> new ApplicationException(
                                ErrorCase.NOT_FOUND,
                                "Usuario no encontrado con id: " + id
                        )
                );

        return userMapper.toRolesResponseDTO(user);
    }

    public UserResponseDTO update(Long id, UpdateUserDTO dto) {
        User user = findUser(id);
        if (userRepository.existsByEmailAndIdNot(dto.getEmail(), id)) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "El email pertenece a otro usuario"
            );
        }
        userMapper.updateEntity(dto, user);
        if (dto.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        User updatedUser = userRepository.save(user);
        return userMapper.toResponseDTO(updatedUser);
    }
    public void delete(Long id) {
        User user = findUser(id);
        userRepository.delete(user);
    }
}
