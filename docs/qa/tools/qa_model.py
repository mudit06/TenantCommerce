"""Shared model for the QA test cases (docs/qa). Cases are written once here and generated into
the Markdown regression scripts and the Excel workbook, so IDs always match."""

from dataclasses import dataclass, field

ADMIN = 'http://localhost:3000/admin'
STORE = 'http://home-orbit.localhost:3000'

PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
TYPES = [
    'Functional', 'Regression', 'Negative', 'Validation', 'Boundary', 'Integration', 'UI/UX',
    'Security/Permissions', 'Data persistence', 'Accessibility',
]
STATUSES = ['Not Run', 'Pass', 'Fail', 'Blocked', 'Not Applicable']
PORTALS = ['Super Admin', 'Vendor CMS', 'End-to-End']


@dataclass
class Module:
    id: str            # SA-01, VC-04, E2E
    portal: str        # one of PORTALS
    name: str
    slug: str          # file name part
    route: str
    role: str          # who runs it
    purpose: str
    preconditions: list[str] = field(default_factory=list)
    depends_on: list[str] = field(default_factory=list)
    screens: list[str] = field(default_factory=list)   # docs/screens ids


@dataclass
class Case:
    id: str
    module: str        # Module.id
    sub: str           # submodule / feature
    func: str          # functionality
    scenario: str      # scenario and objective
    pre: str
    data: str
    steps: list[str]
    expected: str
    priority: str = 'High'
    type: str = 'Functional'
    role: str = ''
    notes: str = ''
    smoke: bool = False   # part of the critical smoke run


def check(cases: list[Case], modules: list[Module]) -> None:
    ids = set()
    known = {m.id for m in modules}
    for c in cases:
        assert c.id not in ids, f'duplicate {c.id}'
        ids.add(c.id)
        assert c.module in known, f'{c.id}: unknown module {c.module}'
        assert c.priority in PRIORITIES, f'{c.id}: priority {c.priority}'
        for t in c.type.split(', '):
            assert t in TYPES, f'{c.id}: type {t}'
        assert c.steps and c.expected, f'{c.id}: steps and expected needed'
