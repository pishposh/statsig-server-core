package statsig

/*
#include "statsig_ffi.h"
#include <stdlib.h>

// Use unique typedef names to avoid collisions with other files
typedef void (*ev_start_fn_t)(void);
typedef int (*ev_log_events_fn_t)(char*);
typedef void (*ev_shutdown_fn_t)(void);

// Prototypes for Go-exported functions; must match cgo-generated signatures exactly
void go_event_logging_adapter_start(void);
int go_event_logging_adapter_log_events(char* request_json);
void go_event_logging_adapter_shutdown(void);
*/
import "C"
import (
	"sync"
)

// EventLoggingAdapterInterface mirrors the function-based adapter expected by Rust.
// Start and Shutdown are lifecycle hooks; LogEvents receives a JSON payload and
// should return true if the batch was accepted for processing.
type EventLoggingAdapterInterface interface {
	Start()
	LogEvents(requestJSON string) bool
	Shutdown()
}

var (
	currentEventLoggingAdapter EventLoggingAdapterInterface
	eventAdapterMutex          sync.RWMutex
)

//export go_event_logging_adapter_start
func go_event_logging_adapter_start() {
	eventAdapterMutex.RLock()
	defer eventAdapterMutex.RUnlock()
	if currentEventLoggingAdapter != nil {
		currentEventLoggingAdapter.Start()
	}
}

//export go_event_logging_adapter_log_events
func go_event_logging_adapter_log_events(requestJSON *C.char) C.int {
	eventAdapterMutex.RLock()
	defer eventAdapterMutex.RUnlock()
	if currentEventLoggingAdapter == nil {
		return C.int(0)
	}
	goJSON := C.GoString(requestJSON)
	if currentEventLoggingAdapter.LogEvents(goJSON) {
		return C.int(1)
	}
	return C.int(0)
}

//export go_event_logging_adapter_shutdown
func go_event_logging_adapter_shutdown() {
	eventAdapterMutex.RLock()
	defer eventAdapterMutex.RUnlock()
	if currentEventLoggingAdapter != nil {
		currentEventLoggingAdapter.Shutdown()
	}
}

// NewEventLoggingAdapter registers a singleton function-based adapter and returns
// a handle that can be passed into StatsigOptions via WithEventLoggingAdapter.
func NewEventLoggingAdapter(adapter EventLoggingAdapterInterface) uint64 {
	eventAdapterMutex.Lock()
	currentEventLoggingAdapter = adapter
	eventAdapterMutex.Unlock()

	adapterRef := C.function_based_event_logging_adapter_create(
		(C.ev_start_fn_t)(C.go_event_logging_adapter_start),
		(C.ev_log_events_fn_t)(C.go_event_logging_adapter_log_events),
		(C.ev_shutdown_fn_t)(C.go_event_logging_adapter_shutdown),
	)
	return uint64(adapterRef)
}
