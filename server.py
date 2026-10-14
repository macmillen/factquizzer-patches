#!/usr/bin/env python3
"""
Development & Production Server for YouTube FactQuizzer PWA.
Run this script to test the Android PWA locally or on your phone over Wi-Fi.

Usage:
  python3 server.py [PORT]
"""

import http.server
import socketserver
import socket
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    
    print("\n" + "=" * 65)
    print("  🧠 YouTube FactQuizzer AI – PWA Server")
    print("=" * 65)
    print(f"  Lokaler PC:    http://localhost:{PORT}/pwa/")
    print(f"  Android Handy:  http://{local_ip}:{PORT}/pwa/")
    print("-" * 65)
    print("  ⚠️  WARUM ZEIGT CHROME 'App kann nicht installiert werden'?")
    print("  Google Chrome verlangt für PWA-Installationen zwingend HTTPS.")
    print("  Normale lokale IPs (http://192.168...) stuft Chrome als unsicher ein.")
    print("-" * 65)
    print("  LÖSUNG 1 (Empfohlen - 20 Sekunden auf dem Handy):")
    print("  1. Öffne auf dem Handy in Chrome:  chrome://flags")
    print("  2. Suche nach: 'Insecure origins treated as secure'")
    print(f"  3. Trage dort ein: http://{local_ip}:{PORT}")
    print("  4. Stelle auf 'Enabled' und tippe auf 'Relaunch'.")
    print(f"  5. Öffne http://{local_ip}:{PORT}/pwa/ ➔ Die App lässt sich sofort installieren!")
    print("-" * 65)
    print("  LÖSUNG 2 (Kostenloser HTTPS-Tunnel via SSH - kein Handy-Setup):")
    print(f"  Führe in einem neuen Terminal auf dem PC aus:")
    print(f"    ssh -R 80:localhost:{PORT} nokey@localhost.run")
    print("  Das erzeugt eine echte 'https://...'-Adresse mit SSL-Zertifikat.")
    print("=" * 65 + "\n")

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer beendet.")

if __name__ == '__main__':
    run()
