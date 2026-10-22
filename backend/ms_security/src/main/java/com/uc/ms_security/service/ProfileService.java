package com.uc.ms_security.service;

import com.uc.ms_security.dto.profile.CreateProfileDTO;
import com.uc.ms_security.dto.profile.ProfileResponseDTO;
import com.uc.ms_security.dto.profile.UpdateProfileDTO;
import com.uc.ms_security.entity.Profile;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.ProfileMapper;
import com.uc.ms_security.repository.ProfileRepository;
import com.uc.ms_security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ProfileMapper profileMapper;

    public ProfileResponseDTO create(CreateProfileDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Usuario no encontrado con id: " + dto.getUserId()
                ));

        if (profileRepository.existsByUserId(user.getId())) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "El usuario ya tiene un perfil"
            );
        }

        Profile profile = profileMapper.toEntity(dto, user);
        Profile savedProfile = profileRepository.save(profile);
        return profileMapper.toResponseDTO(savedProfile);
    }

    public List<ProfileResponseDTO> findAll() {
        List<Profile> profiles = profileRepository.findAll();
        return profileMapper.toResponseDTOList(profiles);
    }

    public ProfileResponseDTO findById(Long id) {
        Profile profile = findEntityById(id);
        return profileMapper.toResponseDTO(profile);
    }

    public ProfileResponseDTO update(Long id, UpdateProfileDTO dto) {
        Profile profile = findEntityById(id);
        profileMapper.updateEntity(dto, profile);
        Profile updatedProfile = profileRepository.save(profile);
        return profileMapper.toResponseDTO(updatedProfile);
    }

    public void delete(Long id) {
        Profile profile = findEntityById(id);
        profileRepository.delete(profile);
    }

    private Profile findEntityById(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Perfil no encontrado con id: " + id
                ));
    }
}