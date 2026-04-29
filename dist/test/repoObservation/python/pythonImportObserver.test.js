/**
 * P25a: Python Import Observer Tests
 */
import { describe, it, expect } from "vitest";
import { observePythonImports, detectProjectPackages } from "../../../src/repoObservation/python/pythonImportObserver.js";
const PROJECT_PKGS = ["saleor"];
const DECLARED = new Set(["django", "graphene", "graphene_django", "celery", "requests"]);
function observe(content, filePath = "saleor/checkout/actions.py") {
    return observePythonImports({ filePath, content, projectPackages: PROJECT_PKGS, declaredPackages: DECLARED });
}
describe("pythonImportObserver", () => {
    describe("standard imports", () => {
        it("detects builtin import", () => {
            const r = observe("import os");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("builtin_python_package");
            expect(r[0].top_level_module).toBe("os");
        });
        it("detects multiple builtins on one line", () => {
            const r = observe("import os, sys, json");
            expect(r).toHaveLength(3);
            expect(r.every(i => i.status === "builtin_python_package")).toBe(true);
        });
        it("detects declared package", () => {
            const r = observe("import django");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("declared_package");
        });
        it("detects project import", () => {
            const r = observe("import saleor.checkout");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("project_import");
            expect(r[0].top_level_module).toBe("saleor");
        });
        it("detects undeclared package", () => {
            const r = observe("import some_unknown_lib");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("undeclared_package");
        });
        it("handles import with alias", () => {
            const r = observe("import numpy as np");
            expect(r).toHaveLength(1);
            expect(r[0].raw_specifier).toBe("numpy");
        });
    });
    describe("from imports", () => {
        it("detects from project import", () => {
            const r = observe("from saleor.checkout import calculations");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("project_import");
            expect(r[0].import_kind).toBe("from_import");
        });
        it("detects relative import (single dot)", () => {
            const r = observe("from .models import Checkout");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("relative_import");
        });
        it("detects relative import (double dot)", () => {
            const r = observe("from ..core import permissions");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("relative_import");
        });
        it("detects from builtin", () => {
            const r = observe("from datetime import timedelta");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("builtin_python_package");
        });
        it("detects from declared package", () => {
            const r = observe("from django.db import models");
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("declared_package");
        });
    });
    describe("dynamic imports", () => {
        it("detects __import__", () => {
            const r = observe('__import__("some_module")');
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("dynamic_or_unresolved");
            expect(r[0].import_kind).toBe("dynamic_import");
        });
        it("detects importlib.import_module", () => {
            const r = observe('importlib.import_module("saleor.plugins.avatax")');
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("dynamic_or_unresolved");
        });
    });
    describe("edge cases", () => {
        it("ignores comments", () => {
            const r = observe("# import os\nimport sys");
            expect(r).toHaveLength(1);
            expect(r[0].top_level_module).toBe("sys");
        });
        it("handles empty content", () => {
            expect(observe("")).toHaveLength(0);
        });
        it("handles multiline file", () => {
            const content = `
import os
import sys
from saleor.checkout import calculations
from .models import Checkout
import django
`;
            const r = observe(content);
            expect(r.length).toBeGreaterThanOrEqual(5);
        });
    });
    describe("multiline imports", () => {
        it("parses from x import (a, b) multiline", () => {
            const content = `from saleor.checkout import (
    utils,
    helpers,
    actions,
)`;
            const r = observe(content);
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("project_import");
            expect(r[0].import_kind).toBe("from_import");
            expect(r[0].raw_specifier).toContain("saleor.checkout");
        });
        it("parses multiline relative import", () => {
            const content = `from .models import (
    Checkout,
    CheckoutLine,
)`;
            const r = observe(content);
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("relative_import");
        });
        it("parses multiline with comments", () => {
            const content = `from django.db import (
    models,
    # transaction,
    connection,
)`;
            const r = observe(content);
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("declared_package");
        });
        it("handles single-line paren import", () => {
            const content = `from saleor.core import (permissions)`;
            // This is NOT multiline (no newline before closing paren)
            // It should still work because the from-import regex handles it
            const r = observe(content);
            expect(r).toHaveLength(1);
            expect(r[0].status).toBe("project_import");
        });
    });
    describe("detectProjectPackages", () => {
        it("detects packages with top-level __init__.py", () => {
            const paths = [
                "saleor/__init__.py",
                "saleor/checkout/__init__.py",
                "saleor/checkout/actions.py",
                "tests/conftest.py",
                "mypackage/__init__.py",
            ];
            const pkgs = detectProjectPackages(paths);
            expect(pkgs).toContain("saleor");
            expect(pkgs).toContain("mypackage");
            expect(pkgs).not.toContain("tests");
        });
    });
});
//# sourceMappingURL=pythonImportObserver.test.js.map