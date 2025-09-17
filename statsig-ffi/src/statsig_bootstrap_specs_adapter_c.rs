use std::os::raw::c_char;

use statsig_rust::{log_e, InstanceRegistry, StatsigBootstrapSpecsAdapter};

const TAG: &str = "StatsigBootstrapSpecsAdapterC";

#[no_mangle]
pub extern "C" fn statsig_bootstrap_specs_adapter_create_from_bytes(
    data_ptr: *const c_char,
    data_len: usize,
) -> u64 {
    if data_ptr.is_null() || data_len == 0 {
        return 0;
    }

    // Safety: caller guarantees the buffer is valid for the duration of this call.
    let bytes: &[u8] = unsafe { std::slice::from_raw_parts(data_ptr as *const u8, data_len) };
    let data = match String::from_utf8(bytes.to_vec()) {
        Ok(s) => s,
        Err(e) => {
            log_e!(TAG, "Invalid UTF-8 in bootstrap specs: {}", e);
            return 0;
        }
    };

    let adapter = StatsigBootstrapSpecsAdapter::new(data);
    InstanceRegistry::register(adapter).unwrap_or_else(|| {
        log_e!(TAG, "Failed to create StatsigBootstrapSpecsAdapter");
        0
    })
}

#[no_mangle]
pub extern "C" fn statsig_bootstrap_specs_adapter_release(specs_adapter_ref: u64) {
    InstanceRegistry::remove(&specs_adapter_ref);
}


