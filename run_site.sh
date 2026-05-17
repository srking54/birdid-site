#!/bin/bash
# run_site.sh — start BirdID-Site for LAN access

# Move to the folder where index.html lives
cd "$(dirname "$0")"

# Get your Pi’s local IP for convenience
IP=$(hostname -I | awk '{print $1}')

# Show clear connection info
echo "-----------------------------------------"
echo " BirdID-Site local server is running!"
echo " Access it from any device on your LAN:"
echo "   http://$IP:8080"
echo " Press Ctrl+C to stop the server."
echo "-----------------------------------------"

# Start the simple HTTP server
python3 -m http.server 8080 --bind 0.0.0.0
#!/bin/bash
# run_site.sh — start local BirdID-Site server

# Move to the folder where index.html lives
cd "$(dirname "$0")"

# Start the simple Python web server on port 8080
echo "Starting BirdID-Site at http://$(hostname -I | awk '{print $1}'):8080"
python3 -m http.server 8080 --bind 0.0.0.0
