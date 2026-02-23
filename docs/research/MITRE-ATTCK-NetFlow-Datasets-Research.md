# MITRE ATT&CK Labeled NetFlow Datasets

*Research conducted: January 19, 2026*

## Executive Summary

This document catalogs publicly available network traffic datasets with MITRE ATT&CK framework labels. These datasets enable training ML-based intrusion detection systems with standardized adversarial technique classifications.

---

## Tier 1: Native ATT&CK Labels

Datasets with built-in MITRE ATT&CK tactic/technique labels.

### UWF-ZeekData24 (Recommended)

| Property | Value |
|----------|-------|
| **Source** | University of West Florida Cyber Range |
| **Format** | Parquet, CSV, PCAP |
| **Size** | ~200GB total |
| **ATT&CK Coverage** | 14 attack families, Enterprise ATT&CK aligned |
| **License** | CC-BY |
| **Download** | https://datasets.uwf.edu/data/ |
| **Paper** | https://www.mdpi.com/2306-5729/10/5/59 |

**Key Features:**
- 4-week experiment with automated attacks
- Zeek conn logs (similar structure to NetFlow)
- `mitre_attack` column with direct ATT&CK labels
- Mission logs correlate attacks to network traffic
- Addresses shortcomings in older datasets (KDDCup99, NSL-KDD)

**Data Collection:**
- 3 subnets with Metasploitable 3 (Ubuntu/Windows), Kali Linux, Security Onion, pfSense
- Network traffic logs shipped to Big Data Platform
- Ground-truth adversarial labels aligned with MITRE ATT&CK

### UWF-ZeekData22

| Property | Value |
|----------|-------|
| **Source** | University of West Florida |
| **Format** | Parquet, CSV, PCAP |
| **Size** | 208GB (16 weeks, 81 subnets) |
| **ATT&CK Coverage** | Reconnaissance, Discovery tactics |
| **Records** | 9.28M attack + 9.28M benign |
| **License** | CC-BY |
| **Download** | https://datasets.uwf.edu/ |
| **Paper** | https://www.mdpi.com/2306-5729/8/1/18 |

**Limitations:**
- CSV subset limited to Reconnaissance/Discovery due to Excel row limits
- Full dataset requires Big Data technologies (Spark)

### UWF-ZeekDataFall22

| Property | Value |
|----------|-------|
| **Source** | University of West Florida |
| **Format** | Parquet, CSV |
| **ATT&CK Coverage** | Multiple tactics |
| **Download** | https://datasets.uwf.edu/ |
| **Paper** | https://www.mdpi.com/2079-9292/12/24/5039 |

### Mordor / OTRF Security-Datasets

| Property | Value |
|----------|-------|
| **Source** | Open Threat Research Foundation |
| **Format** | JSON, PCAP |
| **ATT&CK Coverage** | Full ATT&CK matrix by technique |
| **Download** | https://github.com/OTRF/Security-Datasets |
| **Documentation** | https://mordordatasets.com/introduction.html |

**Key Features:**
- Pre-recorded security events from simulated adversarial techniques
- Categorized by platform, adversary group, tactic, technique
- Includes context events around malicious activity
- Maps to Sigma, Atomic Red Team, Threat Hunter Playbook
- Small datasets (single technique) and large datasets (APT simulations)

**Integration:**
```python
# MSTICPy integration
from msticpy.data import QueryProvider
mordor = QueryProvider("Mordor")
mordor.connect()
```

---

## Tier 2: Mappable to ATT&CK

Datasets with attack labels that can be mapped to ATT&CK techniques.

### ToN-IoT

| Property | Value |
|----------|-------|
| **Source** | UNSW Canberra Cyber Range |
| **Format** | CSV, PCAP, Zeek logs |
| **Size** | ~40GB |
| **Attack Types** | DoS, DDoS, Ransomware, XSS, Injection, Backdoor |
| **Download** | https://ieee-dataport.org/documents/toniot-datasets |
| **HuggingFace** | https://huggingface.co/datasets/codymlewis/TON_IoT_network |
| **Research** | https://research.unsw.edu.au/projects/toniot-datasets |

**Includes:**
- IoT/IIoT sensor telemetry
- Windows 7/10 and Ubuntu 14/18 OS logs
- Network traffic datasets

### BoT-IoT

| Property | Value |
|----------|-------|
| **Source** | UNSW Canberra Cyber Range |
| **Format** | CSV, PCAP, Argus |
| **Size** | 69GB PCAP, 16.7GB CSV |
| **Records** | 72M+ flows |
| **Attack Types** | DDoS, DoS, OS Scan, Service Scan, Keylogging, Data Exfil |
| **Download** | https://ieee-dataport.org/documents/bot-iot-dataset |
| **Research** | https://research.unsw.edu.au/projects/bot-iot-dataset |

### CIC-IDS2017

| Property | Value |
|----------|-------|
| **Source** | Canadian Institute for Cybersecurity |
| **Format** | CSV, PCAP |
| **Size** | ~50GB |
| **Features** | 80+ network flow features |
| **Attack Types** | Brute Force (FTP/SSH), DoS, Heartbleed, Web Attack, Infiltration, Botnet, DDoS |
| **Download** | https://www.unb.ca/cic/datasets/ids-2017.html |
| **Kaggle** | https://www.kaggle.com/datasets/chethuhn/network-intrusion-dataset |

**Timeline:**
- Monday July 3: Benign only
- Tuesday-Friday: Various attacks implemented

### IoT-23

| Property | Value |
|----------|-------|
| **Source** | Stratosphere IPS, CTU Prague |
| **Format** | PCAP, Zeek logs |
| **Size** | 22GB |
| **Coverage** | 20 malware captures + 3 benign |
| **Download** | https://www.stratosphereips.org/datasets-iot23 |

---

## Tier 3: CTI and Taxonomy Datasets

### MITRE ATT&CK STIX Data

| Property | Value |
|----------|-------|
| **Format** | STIX 2.0, STIX 2.1 JSON |
| **Content** | ATT&CK taxonomy (techniques, tactics, groups, software) |
| **Download** | https://github.com/mitre-attack/attack-stix-data |

### MITRE Sightings Ecosystem

| Property | Value |
|----------|-------|
| **Launched** | March 2024 |
| **Coverage** | 1.6M sightings, 353 techniques, 198 countries |
| **Contributors** | Fortinet and others |
| **Access** | https://attack.mitre.org/resources/attack-data-and-tools/ |

---

## ATT&CK Mapping Reference

Common attack labels mapped to MITRE ATT&CK techniques:

| Attack Label | ATT&CK ID | ATT&CK Name |
|--------------|-----------|-------------|
| DoS | T1499 | Endpoint Denial of Service |
| DDoS | T1498 | Network Denial of Service |
| Reconnaissance | TA0043 | Reconnaissance (Tactic) |
| Port Scan | T1046 | Network Service Discovery |
| Exploits | T1203 | Exploitation for Client Execution |
| Brute Force | T1110 | Brute Force |
| Data Exfiltration | T1041 | Exfiltration Over C2 Channel |
| Backdoor | T1059 | Command and Scripting Interpreter |
| C2 Beaconing | T1071 | Application Layer Protocol |
| Keylogging | T1056.001 | Input Capture: Keylogging |
| Ransomware | T1486 | Data Encrypted for Impact |
| SQL Injection | T1190 | Exploit Public-Facing Application |
| XSS | T1189 | Drive-by Compromise |

---

## Recommendations for nfchat

### Primary Dataset: UWF-ZeekData24

Best match for nfchat because:
1. Native MITRE ATT&CK labels in `mitre_attack` column
2. Zeek conn logs have similar structure to NetFlow
3. 14 attack families with Enterprise ATT&CK alignment
4. CC-BY license allows commercial use
5. Direct HTTP download, no account required

### Mapping Current NF-UNSW-NB15-v3

Your current dataset has 9 attack types that map to ATT&CK:

| NF-UNSW-NB15 Label | Suggested ATT&CK Mapping |
|--------------------|--------------------------|
| Benign | N/A |
| Fuzzers | T1499.004 (Application or System Exploitation) |
| Backdoor | T1059 (Command and Scripting Interpreter) |
| DoS | T1499 (Endpoint Denial of Service) |
| Exploits | T1203 (Exploitation for Client Execution) |
| Analysis | T1046 (Network Service Discovery) |
| Worms | T1080 (Taint Shared Content) |
| Generic | T1071 (Application Layer Protocol) |
| Shellcode | T1059.004 (Unix Shell) |
| Reconnaissance | T1595 (Active Scanning) |

---

## Contact Information

### UWF Datasets
- Dr. Sikha Bagui: bagui@uwf.edu
- Dr. Dustin Mink: dmink@uwf.edu
- Dr. Subhash Bagui: sbagui@uwf.edu

### UNSW Datasets
- https://research.unsw.edu.au/

---

## Sources

1. [UWF-ZeekData24 Paper (MDPI Data 2025)](https://www.mdpi.com/2306-5729/10/5/59)
2. [UWF-ZeekData22 Paper (MDPI Data 2023)](https://www.mdpi.com/2306-5729/8/1/18)
3. [UWF Datasets Portal](https://datasets.uwf.edu/)
4. [Mordor Project Documentation](https://mordordatasets.com/introduction.html)
5. [OTRF Security-Datasets GitHub](https://github.com/OTRF/Security-Datasets)
6. [MITRE ATT&CK Data Sources](https://attack.mitre.org/datasources/)
7. [MITRE ATT&CK STIX Data](https://github.com/mitre-attack/attack-stix-data)
8. [ToN-IoT UNSW Research](https://research.unsw.edu.au/projects/toniot-datasets)
9. [BoT-IoT UNSW Research](https://research.unsw.edu.au/projects/bot-iot-dataset)
10. [CIC-IDS2017 UNB](https://www.unb.ca/cic/datasets/ids-2017.html)
11. [IoT-23 Stratosphere IPS](https://www.stratosphereips.org/datasets-iot23)
12. [FloCon 2024 UWF Presentation](https://www.sei.cmu.edu/library/flocon2024-introducing-uwf-zeekdata-network-datasets-based-on-the-mitre-attck-framework/)
