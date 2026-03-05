package tsdb

import (
	"testing"
	"time"
)

func TestClient_PushIntegration(t *testing.T) {
	// Skip if we want to run unit tests without Docker dependencies in the future
	// For this test, we assume VictoriaMetrics is running at localhost:8428 as per docker-compose.yml

	client := NewClient("http://localhost:8428/api/v1/import/prometheus")

	fakeMetrics := []Metric{
		{
			Name: "hqud_test_metric",
			Labels: map[string]string{
				"node":   "test-node",
				"source": "integration_test",
			},
			Value:     42.5,
			Timestamp: time.Now(),
		},
		{
			Name: "hqud_test_metric_no_timestamp",
			Labels: map[string]string{
				"node": "test-node-2",
			},
			Value: 100.1,
		},
	}

	err := client.Push(fakeMetrics)
	if err != nil {
		t.Fatalf("Failed to push metrics to VictoriaMetrics: %v", err)
	}
}

func TestFormatPrometheus(t *testing.T) {
	metrics := []Metric{
		{
			Name: "test_metric_1",
			Labels: map[string]string{
				"label1": "value1",
			},
			Value: 10.5,
		},
	}
	
	formatted := formatPrometheus(metrics)
	
	// Since order of map iteration is random, finding substrings is safer
	expectedNameAndValue := "test_metric_1{"
	if formatted[:len(expectedNameAndValue)] != expectedNameAndValue {
		t.Errorf("Expected to start with %q, got %q", expectedNameAndValue, formatted)
	}
}
