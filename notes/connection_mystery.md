# SSH Connection Mystery

## Resolution (Jan 19, 2026)

**Root Cause:** macOS Sequoia 15+ requires explicit "Local Network" permission for apps to access LAN devices.

**Fix:** System Settings → Privacy & Security → Local Network → Enable for Terminal.app (or iTerm, etc.)

This was a multi-hour debugging session that ruled out every traditional network issue before discovering macOS's new permission model.

---

## Basic Facts

| Item | Value |
|------|-------|
| Mac IP | 192.168.1.19 |
| Pi IP | 192.168.1.106 |
| Pi MAC | d8:3a:dd:f8:73:c6 |
| Subnet | 192.168.1.x/24 |
| Gateway | 192.168.1.1 |
| Pi Hostname | track-controller |
| Router | Netgear Nighthawk |
| Upstream | Google Fiber router (bridge mode) |
| WiFi SSID | Shoccoree 2.4GHz (both Mac and Pi confirmed on same SSID) |

## What Works ✅

- Pi can ping Mac (192.168.1.19) - always works
- Mac ARP table has entry for Pi
- Traceroute from Mac to Pi works (UDP): `traceroute -n 192.168.1.106` → 1 hop, ~5ms
- SSH daemon running on Pi: `systemctl status ssh` → active
- SSH listening on all interfaces: `ss -tlnp` → `0.0.0.0:22`
- Pi network interface up: `ip link show wlan0` → UP
- No firewall rules blocking: `nft list ruleset` and `iptables -L` → empty

## What Fails ❌

- Mac cannot ping Pi: `ping 192.168.1.106` → "No route to host"
- Mac cannot SSH to Pi: `ssh pi@192.168.1.106` → "No route to host"  
- Hostname resolution: `ping track-controller.local` → "Unknown host"

## Debug Steps Taken

1. **Verified SSH running on Pi**
   ```bash
   sudo systemctl status ssh  # → active (running)
   ```

2. **Verified network interface up**
   ```bash
   ip link show wlan0  # → UP
   ```

3. **Confirmed bidirectional awareness**
   - Pi can ping Mac ✅
   - Mac has ARP entry for Pi ✅

4. **Verbose SSH attempt**
   ```bash
   ssh -v -o ConnectTimeout=5 pi@192.168.1.106
   # debug1: Connecting to 192.168.1.106 port 22
   # debug1: connect to address 192.168.1.106 port 22: No route to host
   ```

5. **Checked Pi firewall**
   ```bash
   sudo nft list ruleset   # → empty
   sudo iptables -L -n     # → empty (ACCEPT all)
   ```

6. **Traceroute test (UDP)**
   ```bash
   traceroute -n 192.168.1.106
   # 1  192.168.1.106  7.745 ms  4.290 ms  2.867 ms
   ```
   UDP packets reach the Pi!

7. **Verified SSH bind address**
   ```bash
   sudo ss -tlnp | grep 22
   # LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=110,fd=6))
   ```

8. **Tried disabling WiFi power management**
   ```bash
   sudo iw wlan0 set power_save off
   ```

## The Mystery

- **UDP works** (traceroute reaches Pi)
- **TCP fails** (ping ICMP and SSH TCP both fail with "No route to host")
- **One-way communication**: Pi → Mac works, Mac → Pi fails
- ARP entry exists on Mac, so Layer 2 should be fine

## Hypotheses (Researched)

### 🔴 HIGH LIKELIHOOD

#### 1. WiFi AP/Client Isolation (Router Setting)
Many routers have "AP Isolation", "Client Isolation", or "Guest Network" features that **block WiFi clients from talking to each other**. This perfectly explains:
- Pi can initiate outbound (allowed)
- Mac cannot initiate to Pi (blocked by AP)
- UDP traceroute might work (some routers only block TCP)

**How to test:**
- Check router admin page for "AP Isolation", "Client Isolation", "Wireless Isolation"
- Try connecting Mac to same SSID as Pi (if on different SSIDs)
- Try connecting Pi via ethernet temporarily

#### 2. firewalld Running on Pi (Trixie Default?)
Raspberry Pi OS Trixie uses NetworkManager and **may have firewalld enabled by default**. Even if `nft list ruleset` is empty, firewalld manages its own zones.

**How to test on Pi:**
```bash
sudo systemctl status firewalld
sudo firewall-cmd --list-all
sudo firewall-cmd --zone=public --list-services
```

**Quick fix:**
```bash
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

#### 3. nftables Default Chain Policy
Even with empty rules, nftables can have a **default DROP policy** on input chains. Our setup script does `nft flush ruleset` but doesn't set ACCEPT policy.

**How to test on Pi:**
```bash
sudo nft list chain inet filter input 2>/dev/null
# If this shows policy=drop, that's the problem
```

**Quick fix:**
```bash
sudo nft add table inet filter
sudo nft add chain inet filter input { type filter hook input priority 0 \; policy accept \; }
```

### 🟡 MEDIUM LIKELIHOOD

#### 4. Reverse Path Filtering (rp_filter)
Linux kernel's `rp_filter` can drop packets if the return path doesn't match the incoming interface. WiFi's asymmetric routing might trigger this.

**How to test on Pi:**
```bash
cat /proc/sys/net/ipv4/conf/wlan0/rp_filter
# If 1 or 2, try disabling:
sudo sysctl -w net.ipv4.conf.wlan0.rp_filter=0
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
```

#### 5. DHCP/IP Conflict
If the Pi previously had a different IP or was on ethernet, the router might have stale ARP/DHCP entries causing routing confusion.

**How to test:**
- Check router's DHCP client list for duplicate entries
- On Pi: `ip addr show` - verify only one IP on wlan0
- On Mac: `arp -d 192.168.1.106` then retry

#### 6. WiFi Power Management / Driver Bug
Pi's WiFi chip (Broadcom) has known power-saving issues. Incoming connections can be dropped when the interface is sleeping.

**How to test on Pi:**
```bash
sudo iw wlan0 get power_save  # Check current state
sudo iw wlan0 set power_save off  # Disable
iwconfig wlan0  # Check "Power Management"
```

**Permanent fix** - add to `/etc/rc.local`:
```bash
iw wlan0 set power_save off
```

### ✅ RULED OUT (Mac-Side)

#### Mac VPN Interference
Checked - 4 utun interfaces exist but only have IPv6 addresses. IPv4 routing table correctly routes 192.168.1.x via en0.
```bash
route get 192.168.1.106  # → interface: en0 ✅
```

#### Mac Firewall
Checked - Mac firewall is disabled.
```bash
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
# → Firewall is disabled ✅
```

#### Mac Routing
Verified - default route and 192.168.1.x subnet both go via en0 to gateway 192.168.1.1.

### 🟢 LOWER LIKELIHOOD

#### 7. SSH Config Restricting Connections
`/etc/ssh/sshd_config` might have `AllowUsers`, `AllowGroups`, or `Match` blocks restricting who can connect.

**How to test on Pi:**
```bash
grep -E "^(Allow|Deny|Match)" /etc/ssh/sshd_config
```

#### 8. Subnet Mask Mismatch
If Pi has wrong netmask (e.g., /25 instead of /24), it might think Mac is on a different network.

**How to test on Pi:**
```bash
ip addr show wlan0 | grep inet
# Should show: inet 192.168.1.106/24
```

### Our Setup Context

From `prepare_sd.sh`, the first-boot script:
- Uses NetworkManager (Trixie)
- Runs `nft flush ruleset` (but doesn't set policy)
- Doesn't check/disable firewalld
- Doesn't disable rp_filter
- Doesn't disable WiFi power management persistently

## Recommended Fix Order

1. **Check firewalld**: `sudo systemctl status firewalld` - if running, stop it
2. **Check AP isolation**: Look in router settings
3. **Disable rp_filter**: `sudo sysctl -w net.ipv4.conf.all.rp_filter=0`
4. **Disable WiFi power save**: `sudo iw wlan0 set power_save off`
5. **Try ethernet**: Bypass all WiFi issues

## Debug Session (Jan 19, 2026)

| Test | Result |
|------|--------|
| firewalld | Not installed ✅ ruled out |
| rp_filter | Disabled (was 2) - still fails ✅ ruled out |
| WiFi power_save | Disabled (was on) - still fails ✅ ruled out |
| Netmask | /24 correct ✅ ruled out |
| SSH localhost | nc succeeded ✅ SSH daemon working |
| SSH own wlan0 IP | nc 192.168.1.106:22 succeeded ✅ |
| Ethernet test | Pi at .35 via cat5, Mac still "no route to host" ❌ |
| Mac ARP for Pi | **(incomplete)** - Pi not responding to ARP! |
| Static ARP bypass | Added static entry, still fails |
| tcpdump on Mac | **No packets captured** - packets not leaving Mac |
| Other Linux machine | Can ping Pi at .106 ✅ |
| Chromebook SSH to Pi | Works ✅ |
| Mac PF firewall | **ENABLED** with PIA VPN anchor rules |
| Removed PIA + reboot | Still fails ❌ |
| macOS version | **15.6.1 (Sequoia)** |

**ACTUAL ROOT CAUSE: macOS Sequoia Local Network Permission!**

Sequoia 15+ requires apps to have explicit "Local Network" permission to access LAN devices.

## Resolution Steps

1. Open **System Settings** on Mac
2. Navigate to **Privacy & Security → Local Network**
3. Enable access for **Terminal.app** (or your terminal emulator)
4. Restart Terminal and retry SSH

This permission was introduced in macOS Sequoia (15.0) and blocks apps from initiating connections to local network devices without explicit user consent.

## Lessons Learned

- "No route to host" on macOS can mean permission denied, not a routing issue
- UDP (traceroute) may work when TCP is blocked by app permissions
- Always check OS-level privacy permissions on modern macOS
- Other devices (Linux, Chromebook) working is a strong signal of Mac-specific issue
