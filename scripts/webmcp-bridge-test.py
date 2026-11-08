import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest

spec = importlib.util.spec_from_file_location('relay', Path(__file__).with_name('webmcp-bridge.py'))
relay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(relay)
TOOLS = [{'name': name, 'description': name, 'inputSchema': {'type': 'object'}} for name in relay.NATIVE_NAMES]


class RelayTests(unittest.TestCase):
    def test_validation_rejects_unknown_tools_and_unbounded_plans(self):
        for name, args in [('execute_code', {}), ('duck_play_plan', {'moves': ['right'] * 101, 'expectedRevision': 0}), ('duck_play_plan', {'moves': ['teleport'], 'expectedRevision': 0}), ('duck_move', {'direction': 'right', 'expectedRevision': True})]:
            with self.assertRaises(ValueError):
                relay.validate_call(name, args)

    def test_relay_returns_actual_worker_receipt_and_refuses_overlapping_calls(self):
        with tempfile.TemporaryDirectory() as folder:
            server = relay.Relay(folder, TOOLS, timeout=2)
            expected = {'content': [{'type': 'text', 'text': '{"revision":42,"won":true}'}]}
            results = []
            thread = threading.Thread(target=lambda: results.append(server.call('duck_get_board', {})))
            thread.start()
            for _ in range(50):
                jobs = list(Path(folder).glob('*.job.json'))
                if jobs: break
                time.sleep(.01)
            self.assertTrue(jobs)
            self.assertTrue(server.call('duck_get_board', {})['isError'])
            job = json.loads(jobs[0].read_text())
            Path(folder, job['id'] + '.result.json').write_text(json.dumps(expected))
            thread.join(2)
            self.assertEqual(results, [expected])
            self.assertFalse(jobs[0].exists())

    def test_timeout_never_claims_a_solved_board(self):
        with tempfile.TemporaryDirectory() as folder:
            result = relay.Relay(folder, TOOLS, timeout=.01).call('duck_get_board', {})
            self.assertTrue(result['isError'])
            self.assertIn('timed out', result['content'][0]['text'])


if __name__ == '__main__': unittest.main()
