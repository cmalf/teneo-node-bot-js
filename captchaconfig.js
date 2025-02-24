"use strict";

// Define available captcha services for bypass configuration.
const choice = {
    c1: "capmonster",
    c2: "2captcha",
    c3: "anticaptcha"
};

// website : https://capmonster.cloud/ , https://2captcha.com, https://anti-captcha.com
// Configuration for API keys for different captcha services.
// Fill in your respective API keys.
const config = {
    CAPMONSTER_API_KEY: "YOUR_CAPMONSTER_API_KEY",
    TWO_CAPTCHA_API_KEY: "YOUR_2CAPTCHA_API_KEY",
    ANTICAPTCHA_API_KEY: "YOUR_ANTICAPTCHA_API_KEY"
};

// Select which captcha service to use.
// Captcha bypass configuration: choose one of 'capmonster', '2captcha', or 'anticaptcha'
const ServiceChoice = choice.c1; // Change to your desired service c1,c2,or c3

module.exports = { config, ServiceChoice };
