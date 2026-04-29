package androidx.room

/**
 * Stub annotations for Room @Entity, @PrimaryKey, @ColumnInfo.
 * These exist solely to allow P12 generated code to compile
 * without the full Android/Room dependency chain.
 *
 * ref: P12.1 — Kotlin Compile Harness
 */

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Entity(val tableName: String = "")

@Target(AnnotationTarget.FIELD, AnnotationTarget.PROPERTY, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class PrimaryKey

@Target(AnnotationTarget.FIELD, AnnotationTarget.PROPERTY, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class ColumnInfo(
    val name: String = "",
    val index: Boolean = false,
)
