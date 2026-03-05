package tsdb

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Metric represents a single data point to be pushed to Prometheus/VictoriaMetrics
type Metric struct {
	Name      string
	Labels    map[string]string
	Value     float64
	Timestamp time.Time
}

// Client handles pushing metrics to VictoriaMetrics
type Client struct {
	URL        string
	HTTPClient *http.Client
}

// NewClient creates a new TSDB Client based on the provided URL
func NewClient(url string) *Client {
	return &Client{
		URL: url,
		HTTPClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// formatPrometheus formats metrics into Prometheus text format
// Example: metric_name{label_name="label_value"} 123.4
func formatPrometheus(metrics []Metric) string {
	var sb strings.Builder
	for _, m := range metrics {
		sb.WriteString(m.Name)
		
		if len(m.Labels) > 0 {
			sb.WriteString("{")
			var i int
			for k, v := range m.Labels {
				if i > 0 {
					sb.WriteString(",")
				}
				sb.WriteString(fmt.Sprintf("%s=\"%s\"", k, v))
				i++
			}
			sb.WriteString("}")
		}
		
		// Value and optional timestamp (in milliseconds for Prometheus text format)
		sb.WriteString(fmt.Sprintf(" %f", m.Value))
		if !m.Timestamp.IsZero() {
			// Prometheus expects milliseconds
			sb.WriteString(fmt.Sprintf(" %d", m.Timestamp.UnixMilli()))
		}
		sb.WriteString("\n")
	}
	return sb.String()
}

// Push sends a batch of metrics to VictoriaMetrics using the Prometheus import API
func (c *Client) Push(metrics []Metric) error {
	if len(metrics) == 0 {
		return nil
	}

	payload := formatPrometheus(metrics)
	req, err := http.NewRequest("POST", c.URL, bytes.NewBufferString(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	
	// Optional but recommended for VictoriaMetrics import
	req.Header.Set("Content-Type", "text/plain")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
