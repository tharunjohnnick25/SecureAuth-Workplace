import logging
from typing import Dict, List

class LLMXDRService:
    """
    Acts as the LLM (Large Language Model) integration for XDR (Extended Detection & Response).
    Translates raw mathematical anomaly arrays into actionable human-readable explanations.
    For local development, this uses a sophisticated heuristic template-matching engine 
    to simulate an upstream LLM's natural language generation.
    """
    
    def __init__(self):
        pass
        
    def generate_explanation(self, action: str, factors: Dict[str, float], overrides: List[str]) -> str:
        """
        Simulate an LLM taking in a structured JSON payload and returning a 
        natural language security summary.
        """
        if action == "ALLOW":
            return "Login authorized. Telemetry falls within established behavioral baselines."
            
        explanations = []
        
        # Explain Overrides
        if overrides:
            override_texts = []
            if "BLACKLISTED_IP" in overrides:
                override_texts.append("the source IP address matched a known threat intelligence blacklist")
            if "NON_COMPLIANT_DEVICE" in overrides:
                override_texts.append("the device failed MDM compliance checks (e.g., jailbroken or missing endpoint protection)")
            if "ANONYMIZING_NETWORK" in overrides:
                override_texts.append("traffic originated from an anonymizing network (e.g., TOR)")
                
            explanations.append(f"Immediate {action.lower()} enforced because " + " and ".join(override_texts) + ".")
            
        # Explain Factors
        else:
            factors_text = []
            
            if factors.get("location_severity", 0) > 70:
                factors_text.append("an Impossible Travel anomaly indicating superhuman velocity between recent logins")
            elif factors.get("location_severity", 0) > 30:
                factors_text.append("an access request from a highly unusual geographic region")
                
            if factors.get("device_severity", 0) > 50:
                factors_text.append("an unrecognized or high-risk device fingerprint")
                
            if factors.get("network_severity", 0) > 50:
                factors_text.append("connection via a high-risk public or insecure ISP network")
                
            if factors.get("temporal_severity", 0) > 50:
                factors_text.append("login attempted at a severely anomalous hour outside typical work patterns")
                
            if factors.get("ml_anomaly_severity", 0) > 50:
                factors_text.append("the unsupervised machine learning model detected a multidimensional behavioral deviation")
                
            if factors_text:
                explanations.append(f"Authentication was {action.lower()}ed due to " + ", as well as ".join(factors_text) + ".")
            else:
                explanations.append(f"Authentication {action.lower()}ed due to an aggregated high risk score across multiple telemetry signals.")

        # Simulate the 'XDR' assistant persona
        return "AI Security Assistant: " + " ".join(explanations)
