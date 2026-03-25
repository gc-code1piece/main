package com.ember.ember;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class EmberApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmberApplication.class, args);
    }
}
