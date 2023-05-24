from kubernetes import client, watch, config
import os
import time
import requests
import datetime
import pytz
import json
import logging

DEV_MODE = os.environ.get("DEV", "false").lower() == "true"
PUBLISHER_SECRET = os.environ.get("PUBLISHER_SECRET")
WS_HOST = os.environ.get("WS_HOST")
NAMESPACE = os.environ.get("NAMESPACE")
RECONNECT_TIMEOUT = int(os.environ.get("API_RECONNECT_TIMEOUT", "5"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({
    "Authorization": f"Basic { PUBLISHER_SECRET }"
})

def get_container_state(container_status):
    state = container_status.state
    if state.waiting is not None:
        state = state.waiting
        return {
            "type": "WAITING",
            "message": state.message,
            "reason": state.reason
        }
    elif state.running is not None:
        state = state.running
        return {
            "type": "RUNNING",
            "started_at": state.started_at.astimezone(pytz.UTC).timestamp() if state.started_at is not None else None
        }
    elif state.terminated is not None:
        state = state.terminated
        return {
            "type": "TERMINATED",
            "exit_code": state.exit_code,
            "message": state.message,
            "reason": state.reason,
            "started_at": state.started_at.astimezone(pytz.UTC).timestamp() if state.started_at is not None else None,
            "finished_at": state.finished_at.astimezone(pytz.UTC).timestamp() if state.finished_at is not None else None
        }

def handle_pod_event(event):
    event_type = event["type"]
    instance = event["object"]

    pod_name = instance.metadata.name
    pod_labels = instance.metadata.labels
    pod_status = instance.status.phase
    container_statuses = instance.status.container_statuses
    
    is_tycho_app = pod_labels.get("executor", None) == "tycho"
    if not is_tycho_app:
        return
    if event_type == "ADDED":
        logger.info("ADDED event - Skipping...")
        return

    # Terminating is not an actual pod phase, see k8s pod phase docs
    deletion_timestamp = instance.metadata.deletion_timestamp

    container_states = [
        {
            "container_name": container_status.name,
            "container_state": get_container_state(container_status)
        }
        for container_status in container_statuses
    ] if container_statuses is not None else None

    app_id = pod_labels["tycho-guid"]
    app_owner = pod_labels["username"]
    app_status = None
    if event_type == "DELETED":
        app_status = "TERMINATED"
    elif event_type == "MODIFIED":
        if deletion_timestamp is not None:
            app_status = "SUSPENDING"
        elif pod_status == "Pending":
            app_status = "LAUNCHING"
        elif pod_status == "Running":
            app_status = "LAUNCHED"
        elif pod_status == "Failed":
            app_status = "FAILED"
    
#     logger.info(f"""Pod name: { pod_name }
# - Pod event: { event_type }
# - Pod status: { pod_status }
# - App status: { app_status }\
# """)
    print("~" * 75 + "\n")
    logger.info(f"""Status: { app_status }
- Name: {  pod_name }
- Owner: { app_owner }\
""")
    if container_states is not None:
        for state in container_states:
            print(f"Container \"{ state['container_name'] }\" state:", state["container_state"]["type"])

    try:
        session.post(f"http://{ WS_HOST }:5555/hooks/app/status", json={
            "app_id": app_id,
            "app_user": app_owner,
            "status": app_status,
            "container_states": container_states
        })
        logger.info("Posted event data to webhook")
    except Exception as e:
        logger.error(f"{ e.__class__.__name__ } - Failed to post event to webhook")
    
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
    

def main():
    if DEV_MODE: config.load_kube_config()
    else: config.load_incluster_config()
    core_v1_api = client.CoreV1Api()

    logger.info(f'Monitoring pod events in namespace "{ NAMESPACE }"')

    latest_resource_version = None
    while True:
        stream = watch.Watch().stream(
            core_v1_api.list_namespaced_pod,
            NAMESPACE
        )
        try:
            for event in stream:
                latest_resource_version = event["object"].metadata.resource_version
                handle_pod_event(event)
        except Exception as e:
            if isinstance(e, KeyboardInterrupt): break
            logger.warning(f"Connection with Kubernetes server closed. Attempting to reconnect in { RECONNECT_TIMEOUT }s...")
            time.sleep(RECONNECT_TIMEOUT)

if __name__ ==  "__main__":
    main()