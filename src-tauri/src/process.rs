use sysinfo::{ProcessRefreshKind, RefreshKind, System};

pub fn is_process_running(process_name: &str) -> Result<bool, String> {
    let s =
        System::new_with_specifics(RefreshKind::new().with_processes(ProcessRefreshKind::new()));

    let target_name = process_name.to_lowercase();

    for process in s.processes_by_exact_name(target_name.as_str()) {
        if process.name().to_lowercase() == target_name {
            return Ok(true);
        }
    }

    if target_name.ends_with(".exe") {
        let without_exe = &target_name[..target_name.len() - 4];
        for process in s.processes_by_exact_name(without_exe) {
            if process.name().to_lowercase() == without_exe {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_process_running() {
        // actually, its better to test with a known process? maybe yes
        let result = is_process_running("nonexistent_process_12345.exe");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
