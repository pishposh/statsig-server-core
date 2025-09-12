package com.statsig;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

/**
 * Tests to verify that HTTP requests are properly intercepted and mocked. This test focuses on
 * verifying the request structure rather than responses.
 */
public class HttpRequestInterceptionTest {
  private MockWebServer mockWebServer;
  private Statsig statsig;
  private StatsigUser testUser;
  private String downloadConfigSpecsJson;

  @BeforeEach
  public void setUp() throws IOException, InterruptedException, ExecutionException {
    downloadConfigSpecsJson = TestUtils.loadJsonFromFile("download_config_specs.json");

    mockWebServer = new MockWebServer();
    mockWebServer.start();

    mockWebServer.enqueue(
        new MockResponse()
            .setResponseCode(200)
            .setHeader("Content-Type", "application/json")
            .setBody(downloadConfigSpecsJson));
    Map<String, Object> custom = new HashMap<>();
    custom.put("custom_field", "custom_value");

    testUser =
        new StatsigUser.Builder()
            .setUserID("test_user_id")
            .setEmail("test@example.com")
            .setCustom(custom)
            .build();

    StatsigOptions options =
        new StatsigOptions.Builder()
            .setSpecsUrl(mockWebServer.url("/v2/download_config_specs").toString())
            .setOutputLoggerLevel(OutputLogger.LogLevel.DEBUG)
            .build();

    statsig = new Statsig("secret-test-key", options);
  }

  @AfterEach
  public void tearDown() throws IOException, ExecutionException, InterruptedException {
    if (statsig != null) {
      statsig.shutdown().get();
    }
    mockWebServer.shutdown();
  }
}
