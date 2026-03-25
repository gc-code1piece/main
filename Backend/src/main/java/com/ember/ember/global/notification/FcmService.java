package com.ember.ember.global.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * FCM 푸시 알림 발송 서비스
 */
@Slf4j
@Service
public class FcmService {

    /**
     * 단일 디바이스에 푸시 알림 발송
     */
    public void sendPush(String deviceToken, String title, String body, Map<String, String> data) {
        Message message = Message.builder()
                .setToken(deviceToken)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putAllData(data != null ? data : Map.of())
                .build();

        try {
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM 발송 성공: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("FCM 발송 실패: token={}, error={}", deviceToken, e.getMessage());

            // 토큰 만료(UNREGISTERED) 시 처리
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                log.warn("만료된 FCM 토큰: {}", deviceToken);
                // TODO: deviceTokenRepository.deleteByToken(deviceToken);
            }
        } catch (IllegalStateException e) {
            log.warn("Firebase가 초기화되지 않았습니다: {}", e.getMessage());
        }
    }

    /**
     * 데이터 없이 푸시 알림 발송
     */
    public void sendPush(String deviceToken, String title, String body) {
        sendPush(deviceToken, title, body, null);
    }
}
