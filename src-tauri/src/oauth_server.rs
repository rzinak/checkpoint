use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::{oneshot, Mutex};
use once_cell::sync::Lazy;
use warp::Filter;

// Global state for OAuth flow
struct OAuthState {
    code_sender: Option<oneshot::Sender<String>>,
    code_receiver: Option<oneshot::Receiver<String>>,
    server_running: AtomicBool,
}

impl OAuthState {
    fn new() -> Self {
        let (tx, rx) = oneshot::channel();
        Self {
            code_sender: Some(tx),
            code_receiver: Some(rx),
            server_running: AtomicBool::new(false),
        }
    }
    
    fn reset(&mut self) {
        let (tx, rx) = oneshot::channel();
        self.code_sender = Some(tx);
        self.code_receiver = Some(rx);
        self.server_running.store(false, Ordering::SeqCst);
    }
}

static OAUTH_STATE: Lazy<Arc<Mutex<OAuthState>>> = 
    Lazy::new(|| Arc::new(Mutex::new(OAuthState::new())));

#[tauri::command]
pub async fn start_oauth_server() -> Result<u16, String> {
    println!("start_oauth_server called");
    let mut state = OAUTH_STATE.lock().await;
    
    // Reset state for new OAuth flow
    state.reset();
    println!("State reset complete");
    
    // Take ownership of the sender for use in the route handler
    let code_sender = Arc::new(Mutex::new(state.code_sender.take()));
    println!("Sender taken and wrapped in Arc");
    
    // HTML response for the callback page
    let html = r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Checkpoint - Authorization Success</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      margin: 0; 
      background: #f2f3f5; 
      text-align: center; 
    }
    .container { 
      padding: 2rem; 
    }
    .success { 
      color: #4a7c59; 
      font-size: 1.5rem; 
      margin-bottom: 1rem; 
    }
    p { 
      color: #5f6368; 
      font-size: 1rem; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓ Authorization Successful!</div>
    <p>You can close this window and return to Checkpoint.</p>
  </div>
</body>
</html>"#;

    // Use a different port than Vite dev server (1420)
    // Try 9876 or find an available port
    let port = 9876u16;
    let addr: std::net::SocketAddr = ([127, 0, 0, 1], port).into();
    
    // Build the route
    let html_response = html.to_string();
    let sender_clone = code_sender.clone();
    
    let routes = warp::path("auth-callback.html")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .map(move |params: std::collections::HashMap<String, String>| {
            println!("OAuth callback received! Params: {:?}", params);
            
            // Check if we have a code parameter
            if let Some(code) = params.get("code") {
                println!("Got code: {}", code);
                // Try to send the code
                let code = code.clone();
                let sender = sender_clone.clone();
                
                tokio::spawn(async move {
                    println!("Trying to send code through channel...");
                    let mut guard = sender.lock().await;
                    if let Some(tx) = guard.take() {
                        println!("Sending code...");
                        let result = tx.send(code);
                        println!("Send result: {:?}", result.is_ok());
                    } else {
                        println!("Sender already taken!");
                    }
                });
            } else {
                println!("No code in params!");
            }
            
            warp::reply::html(html_response.clone())
        });

    // Mark server as running
    state.server_running.store(true, Ordering::SeqCst);
    
    // Spawn the server
    let running_flag = Arc::new(AtomicBool::new(true));
    let running_clone = running_flag.clone();
    
    tokio::spawn(async move {
        let (_, server) = warp::serve(routes).bind_ephemeral(addr);
        
        // Run server with 5 minute timeout
        let _result = tokio::time::timeout(
            tokio::time::Duration::from_secs(300),
            server
        ).await;
        
        // Clean up when server stops
        running_clone.store(false, Ordering::SeqCst);
        
        // Also update the global state
        let state = OAUTH_STATE.lock().await;
        state.server_running.store(false, Ordering::SeqCst);
    });

    println!("OAuth server started on port {}", port);
    Ok(port)
}

#[tauri::command]
pub async fn wait_for_oauth_code() -> Result<Option<String>, String> {
    println!("wait_for_oauth_code called");
    let mut state = OAUTH_STATE.lock().await;
    
    // Take the receiver
    if let Some(receiver) = state.code_receiver.take() {
        println!("Got receiver, waiting for code...");
        // Drop the lock while waiting
        drop(state);
        
        // Wait for up to 5 minutes
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(300),
            receiver
        ).await {
            Ok(Ok(code)) => {
                println!("Received code successfully!");
                Ok(Some(code))
            }
            Ok(Err(_)) => {
                println!("Channel closed without sending code");
                Ok(None)
            }
            Err(_) => {
                println!("Timeout waiting for code");
                Ok(None)
            }
        }
    } else {
        println!("No receiver available!");
        Err("OAuth flow not started. Please call start_oauth_server first.".to_string())
    }
}

#[tauri::command]
pub async fn stop_oauth_server() -> Result<(), String> {
    let state = OAUTH_STATE.lock().await;
    state.server_running.store(false, Ordering::SeqCst);
    Ok(())
}
