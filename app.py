import os
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
import json
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "cache.json"

def fetch_and_parse_feed():
    """Fetches the XML feed, parses it, and structures the release notes."""
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except urllib.error.URLError as e:
        print(f"Error fetching feed: {e}")
        # Try to load from cache if network fails
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r') as f:
                return json.load(f), True # data, is_cached=True
        raise e

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r') as f:
                return json.load(f), True
        raise e

    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    parsed_updates = []
    
    for entry_idx, entry in enumerate(entries):
        title = entry.find('atom:title', namespaces)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', namespaces)
        updated_str = updated.text.strip() if updated is not None else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        if content_elem is None or not content_elem.text:
            continue
            
        content_html = content_elem.text
        
        # Split by h3 sections
        # Format: <h3>Type</h3> ... content ...
        # Using a regex to find all h3 headers and their contents up to the next h3 or end of text.
        matches = re.findall(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL)
        
        if not matches:
            # Fallback if no <h3> tags found, just treat the whole content as a general update
            clean_type = "Update"
            clean_body = content_html.strip()
            item_id = f"{date_str.replace(' ', '_')}_{entry_idx}_0"
            parsed_updates.append({
                "id": item_id,
                "date": date_str,
                "updated": updated_str,
                "link": link,
                "type": clean_type,
                "content": clean_body
            })
        else:
            for sub_idx, (type_text, body_text) in enumerate(matches):
                clean_type = type_text.strip()
                clean_body = body_text.strip()
                item_id = f"{date_str.replace(' ', '_')}_{entry_idx}_{sub_idx}"
                parsed_updates.append({
                    "id": item_id,
                    "date": date_str,
                    "updated": updated_str,
                    "link": link,
                    "type": clean_type,
                    "content": clean_body
                })

    # Cache the parsed updates
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(parsed_updates, f, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

    return parsed_updates, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates', methods=['GET'])
def get_updates():
    try:
        # Load from cache if it exists, otherwise fetch
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r') as f:
                updates = json.load(f)
            return jsonify({"updates": updates, "cached": True})
        else:
            updates, is_cached = fetch_and_parse_feed()
            return jsonify({"updates": updates, "cached": is_cached})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/refresh', methods=['POST'])
def refresh_updates():
    try:
        updates, is_cached = fetch_and_parse_feed()
        return jsonify({"updates": updates, "cached": is_cached, "success": True})
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
