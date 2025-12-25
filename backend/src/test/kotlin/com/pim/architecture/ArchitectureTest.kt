package com.pim.architecture

import com.tngtech.archunit.core.domain.JavaClasses
import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.ArchRule
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*
import com.tngtech.archunit.library.Architectures.layeredArchitecture
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.springframework.stereotype.Controller
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.RestController

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ArchitectureTest {

    private lateinit var importedClasses: JavaClasses

    @BeforeAll
    fun setup() {
        importedClasses = ClassFileImporter()
            .withImportOption(ImportOption.DoNotIncludeTests())
            .importPackages("com.pim")
    }

    @Test
    fun `domain layer should not depend on infrastructure`() {
        val rule: ArchRule = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..")

        rule.check(importedClasses)
    }

    @Test
    fun `domain layer should not depend on application layer`() {
        val rule: ArchRule = noClasses()
            .that().resideInAPackage("..domain..")
            .and().resideOutsideOfPackage("..domain.shared..")
            .should().dependOnClassesThat().resideInAPackage("..application..")

        rule.check(importedClasses)
    }

    @Test
    fun `application layer should not depend on web controllers`() {
        val rule: ArchRule = noClasses()
            .that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure.web..")

        rule.check(importedClasses)
    }

    @Test
    fun `controllers should only be in web package`() {
        val rule: ArchRule = classes()
            .that().areAnnotatedWith(RestController::class.java)
            .or().areAnnotatedWith(Controller::class.java)
            .should().resideInAPackage("..infrastructure.web..")

        rule.check(importedClasses)
    }

    @Test
    fun `services should be annotated with Service`() {
        val rule: ArchRule = classes()
            .that().resideInAPackage("..application..")
            .and().haveSimpleNameEndingWith("Service")
            .should().beAnnotatedWith(Service::class.java)

        rule.check(importedClasses)
    }

    @Test
    fun `repositories should be in persistence package`() {
        val rule: ArchRule = classes()
            .that().haveSimpleNameEndingWith("Repository")
            .should().resideInAPackage("..infrastructure.persistence..")

        rule.check(importedClasses)
    }

    @Test
    fun `entities should be in domain package`() {
        val rule: ArchRule = classes()
            .that().areAnnotatedWith(jakarta.persistence.Entity::class.java)
            .should().resideInAPackage("..domain..")

        rule.check(importedClasses)
    }

    @Test
    fun `no cycles between packages`() {
        val rule = slices()
            .matching("com.pim.(*)..")
            .should().beFreeOfCycles()

        rule.check(importedClasses)
    }

    @Test
    fun `layered architecture should be respected`() {
        val rule = layeredArchitecture()
            .consideringAllDependencies()
            .layer("Config").definedBy("..config..")
            .layer("Web").definedBy("..infrastructure.web..")
            .layer("Application").definedBy("..application..")
            .layer("Domain").definedBy("..domain..")
            .layer("Persistence").definedBy("..infrastructure.persistence..")
            .whereLayer("Web").mayNotBeAccessedByAnyLayer()
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Web", "Config")
            .whereLayer("Persistence").mayOnlyBeAccessedByLayers("Application", "Config")

        rule.check(importedClasses)
    }

    @Test
    fun `domain exceptions should extend DomainException`() {
        val rule: ArchRule = classes()
            .that().resideInAPackage("..domain.shared..")
            .and().areAssignableTo(RuntimeException::class.java)
            .and().doNotHaveSimpleName("DomainException")
            .should().beAssignableTo(com.pim.domain.shared.DomainException::class.java)

        rule.check(importedClasses)
    }

    @Test
    fun `config classes should be in config package`() {
        val rule: ArchRule = classes()
            .that().areAnnotatedWith(org.springframework.context.annotation.Configuration::class.java)
            .should().resideInAPackage("..config..")

        rule.check(importedClasses)
    }
}
